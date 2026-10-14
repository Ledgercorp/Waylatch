import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, unlink, access } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus, platform, arch } from 'node:os';
import { createReviewer, SEMANTIC_THRESHOLD } from '../src/risk/review';
import {
  embedTexts,
  disposeModel,
  MODEL_ID,
  MODEL_REVISION,
  modelMetrics,
  modelRuntime,
} from '../src/risk/model';
import { MODEL_ASSETS } from '../src/risk/model-assets';
import {
  binaryMetrics,
  pairedGroupBootstrap,
  validateEvaluationInputs,
  METHODS,
  type Method,
  type ScoredCase,
  type EvaluationCase,
  type Annotation,
} from '../src/risk/evaluation';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SCORING_FILES = [
  'scripts/evaluate-ai.ts',
  'src/risk/evaluation.ts',
  'src/risk/review.ts',
  'src/risk/model.ts',
  'src/risk/model-assets.ts',
  'package-lock.json',
];
export const SETTINGS = {
  model: MODEL_ID,
  revision: MODEL_REVISION,
  dtype: 'q8',
  device: 'cpu',
  embeddingDimensions: 384,
  semanticThreshold: 0.6,
  combinedThreshold: SEMANTIC_THRESHOLD,
  methods: METHODS,
  bootstrap: { seed: 20261013, iterations: 10000, unit: 'supplyFamily' },
  remoteModelsAllowed: false,
  intraOpThreads: 2,
  interOpThreads: 1,
  assets: MODEL_ASSETS,
};
export interface EvaluationOptions {
  mode: 'calibration' | 'freeze' | 'heldout';
  datasetPath: string;
  annotationsPath: string;
  outputPath: string;
  manifestPath: string;
  calibrationPath: string;
}
const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function json(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8'));
}
async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
async function save(path: string, value: unknown, exclusive = false): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: exclusive ? 'wx' : 'w' });
}
export async function evaluationFingerprint(datasetPath: string, annotationsPath: string) {
  const sources = await Promise.all(
    SCORING_FILES.map(async (path) => ({
      path,
      sha256: hash(await readFile(resolve(ROOT, path))),
    })),
  );
  return {
    datasetSha256: hash(await readFile(datasetPath)),
    annotationsSha256: hash(await readFile(annotationsPath)),
    scoringSources: sources,
    settings: SETTINGS,
  };
}
export function assertFrozen(fingerprint: unknown, frozen: Record<string, unknown>): void {
  if (
    frozen.schemaVersion !== 1 ||
    frozen.category !== 'frozen-before-heldout-inference' ||
    !frozen.frozenAt ||
    !frozen.calibrationEvidenceSha256
  )
    throw new Error('A valid pre-inference frozen manifest is required');
  if (JSON.stringify(fingerprint) !== JSON.stringify(frozen.fingerprint))
    throw new Error(
      'Frozen dataset, annotations, scoring code or model settings changed; heldout inference refused',
    );
}
export async function assertHeldoutNotCompleted(
  manifestPath: string,
  outputPath: string,
): Promise<void> {
  if (await exists(`${manifestPath}.completed.json`))
    throw new Error('Heldout evaluation already completed for this frozen manifest; rerun refused');
  if (await exists(outputPath)) {
    const report = await json(outputPath);
    if (report.category !== 'blocked-local-model-unavailable')
      throw new Error('Heldout output already exists; overwrite refused');
  }
}
function composition(
  cases: EvaluationCase[],
  labels: ReturnType<typeof validateEvaluationInputs>['labels'],
) {
  const families: Record<string, number> = {},
    categories: Record<string, number> = {};
  const decisions = { duplicate: 0, distinct: 0, ambiguous: 0 };
  for (const item of cases) {
    families[item.supplyFamily] = (families[item.supplyFamily] ?? 0) + 1;
    categories[item.category] = (categories[item.category] ?? 0) + 1;
    decisions[labels.get(item.id)!.decision]++;
  }
  return {
    cases: cases.length,
    familyCount: Object.keys(families).length,
    families,
    categories,
    decisions,
  };
}
const LIMITATIONS = [
  'Synthetic scenarios with independent model-blind AI annotations; no human-adjudicated or real-field ground truth.',
  'Review recommendations indicate possible duplicate expenses and never establish fraud or a fraud probability.',
  'Wilson precision/recall intervals are case-level descriptive binomial intervals and ignore within-family dependence; paired family bootstrap intervals account for grouped resampling.',
  'Only four calibration and eight heldout families are planned; bootstrap intervals with so few groups are exploratory and do not establish generalization to a population.',
  'Shared embeddings support all semantic comparisons. Scoring times exclude shared model work; these are not three independent end-to-end pipeline benchmarks.',
  'Local CPU timings and memory describe this host only; they do not establish browser/mobile performance.',
  'Ambiguous annotations are excluded from binary metrics and bootstrap F1; their predictions remain visible.',
  'The old 12-case benchmark is calibration evidence only and is preserved separately.',
];
function cosine(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    normA += a[index] ** 2;
    normB += b[index] ** 2;
  }
  return Math.max(-1, Math.min(1, dot / Math.sqrt(normA * normB)));
}

export async function runEvaluation(options: EvaluationOptions): Promise<Record<string, unknown>> {
  if (SEMANTIC_THRESHOLD !== 0.6)
    throw new Error(
      'This protocol pins both semantic thresholds to 0.60; update the protocol deliberately before calibration if scoring changes',
    );
  const input = validateEvaluationInputs(
    await json(options.datasetPath),
    await json(options.annotationsPath),
  );
  const fingerprint = await evaluationFingerprint(options.datasetPath, options.annotationsPath);
  if (options.mode === 'freeze') {
    const calibration = await json(options.calibrationPath);
    if (
      calibration.category !== 'executed-real-local-ai-comparison' ||
      calibration.split !== 'calibration' ||
      JSON.stringify(calibration.fingerprint) !== JSON.stringify(fingerprint)
    )
      throw new Error(
        'Freeze requires successful real local AI calibration with the same dataset, annotations, code and settings',
      );
    const manifest = {
      schemaVersion: 1,
      category: 'frozen-before-heldout-inference',
      frozenAt: new Date().toISOString(),
      datasetId: input.datasetId,
      fingerprint,
      calibrationEvidenceSha256: hash(await readFile(options.calibrationPath)),
      selection:
        'Existing review logic retained. Semantic cosine and combined review thresholds fixed at 0.60 before heldout inference.',
      limitations: LIMITATIONS,
    };
    await save(options.manifestPath, manifest, true);
    return manifest;
  }
  const split = options.mode;
  const cases = input.cases.filter((item) => item.split === split);
  if (!cases.length) throw new Error(`No ${split} cases`);
  let frozen: Record<string, unknown> | null = null;
  let locked = false;
  const lockPath = `${options.manifestPath}.running`;
  if (split === 'heldout') {
    frozen = await json(options.manifestPath);
    assertFrozen(fingerprint, frozen);
    if (hash(await readFile(options.calibrationPath)) !== frozen.calibrationEvidenceSha256)
      throw new Error('Calibration evidence changed after settings were frozen');
    await assertHeldoutNotCompleted(options.manifestPath, options.outputPath);
    await writeFile(
      lockPath,
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
      { flag: 'wx' },
    );
    locked = true;
    try {
      await assertHeldoutNotCompleted(options.manifestPath, options.outputPath);
    } catch (error) {
      await unlink(lockPath);
      throw error;
    }
  }
  const started = performance.now(),
    baselineRss = process.memoryUsage().rss;
  const common = {
    schemaVersion: 1,
    datasetId: input.datasetId,
    split,
    executedAt: new Date().toISOString(),
    fingerprint,
    provenance: input.provenance,
    annotationMethod: (await json(options.annotationsPath)).method,
    splitPolicy: input.splitPolicy,
    sampleComposition: composition(cases, input.labels),
    frozenManifestSha256: frozen ? hash(await readFile(options.manifestPath)) : null,
    metricsInterpretation:
      split === 'calibration'
        ? 'Calibration only; cannot estimate heldout performance.'
        : 'One heldout evaluation of frozen settings; limited to this synthetic grouped test set.',
    limitations: LIMITATIONS,
  };
  try {
    const vectors: number[][] = [];
    const texts = cases.flatMap((item) => [item.left.description, item.right.description]);
    const embeddingStarted = performance.now();
    let coldStartupAndFirstBatchMilliseconds: number | null = null;
    let sharedEmbeddingCalls = 0;
    try {
      for (let offset = 0; offset < texts.length; offset += 100) {
        const batchStarted = performance.now();
        const expected = texts.slice(offset, offset + 100);
        const result = await embedTexts(expected);
        if (
          result.length !== expected.length ||
          result.some(
            (vector) =>
              vector.length !== 384 ||
              !vector.every(Number.isFinite) ||
              !vector.some((value) => value !== 0),
          )
        )
          throw new Error('Invalid output from real embedding model');
        if (offset === 0) coldStartupAndFirstBatchMilliseconds = performance.now() - batchStarted;
        sharedEmbeddingCalls++;
        vectors.push(...result);
      }
    } catch (error) {
      const report = {
        ...common,
        category: 'blocked-local-model-unavailable',
        realInferenceCompleted: false,
        failure: error instanceof Error ? error.message : String(error),
        metrics: null,
        pairedComparisons: null,
        results: [],
        runtime: {
          elapsedMilliseconds: performance.now() - started,
          sharedEmbeddingCallsCompleted: sharedEmbeddingCalls,
          completedEmbeddingVectors: vectors.length,
        },
      };
      await save(options.outputPath, report);
      return report;
    }
    const sharedEmbeddingMilliseconds = performance.now() - embeddingStarted;
    const scoringMilliseconds: Record<Method, number> = {
      deterministic: 0,
      semantic: 0,
      combined: 0,
    };
    const deterministicReviewer = createReviewer(async () => {
      throw new Error('Deterministic baseline explicitly disables semantic embeddings');
    });
    const results: Array<
      ScoredCase & {
        groupId: string;
        scenario: string;
        left: EvaluationCase['left'];
        right: EvaluationCase['right'];
        annotation: Annotation;
        similarity: number;
        reasons: { deterministic: string[]; combined: string[] };
      }
    > = [];
    const rows: ScoredCase[] = [];
    for (let index = 0; index < cases.length; index++) {
      const item = cases[index],
        annotation = input.labels.get(item.id)!;
      let time = performance.now();
      const deterministic = await deterministicReviewer(item.left, [item.right]);
      scoringMilliseconds.deterministic += performance.now() - time;
      if (deterministic.mode !== 'deterministic-only' || deterministic.candidates.length !== 1)
        throw new Error('Deterministic baseline failed');
      time = performance.now();
      const similarity = cosine(vectors[2 * index], vectors[2 * index + 1]);
      const semantic = similarity >= SETTINGS.semanticThreshold;
      scoringMilliseconds.semantic += performance.now() - time;
      time = performance.now();
      const combined = await createReviewer(async () => [
        vectors[2 * index],
        vectors[2 * index + 1],
      ])(item.left, [item.right]);
      scoringMilliseconds.combined += performance.now() - time;
      if (
        combined.mode !== 'semantic-local' ||
        combined.candidates.length !== 1 ||
        combined.candidates[0].similarity === null
      )
        throw new Error('Combined reviewer fell back; successful inference comparison refused');
      const row: ScoredCase = {
        caseId: item.id,
        supplyFamily: item.supplyFamily,
        category: item.category,
        duplicate: annotation.decision === 'ambiguous' ? null : annotation.decision === 'duplicate',
        predictions: {
          deterministic: deterministic.candidates[0].reviewRecommended,
          semantic,
          combined: combined.candidates[0].reviewRecommended,
        },
      };
      rows.push(row);
      results.push({
        ...row,
        groupId: item.groupId,
        scenario: item.scenario,
        left: item.left,
        right: item.right,
        annotation,
        similarity,
        reasons: {
          deterministic: deterministic.candidates[0].reasons,
          combined: combined.candidates[0].reasons,
        },
      });
    }
    const methodMetrics = (sample: ScoredCase[]) =>
      Object.fromEntries(
        METHODS.map((method) => [
          method,
          binaryMetrics(
            sample.map((row) => ({ duplicate: row.duplicate, predicted: row.predictions[method] })),
          ),
        ]),
      );
    const strata = (field: 'supplyFamily' | 'category') =>
      Object.fromEntries(
        [...new Set(rows.map((row) => row[field]))]
          .sort()
          .map((key) => [key, methodMetrics(rows.filter((row) => row[field] === key))]),
      );
    const evaluationStarted = performance.now();
    const metrics = methodMetrics(rows);
    const pairedComparisons = [
      pairedGroupBootstrap(rows, 'deterministic', 'combined'),
      pairedGroupBootstrap(rows, 'semantic', 'combined'),
      pairedGroupBootstrap(rows, 'deterministic', 'semantic'),
    ];
    const failures = Object.fromEntries(
      METHODS.map((method) => [
        method,
        results
          .filter((row) => row.duplicate !== null && row.predictions[method] !== row.duplicate)
          .map((row) => ({
            caseId: row.caseId,
            category: row.category,
            supplyFamily: row.supplyFamily,
            leftDescription: row.left.description,
            rightDescription: row.right.description,
            decision: row.annotation.decision,
            rationale: row.annotation.rationale,
            failure: row.predictions[method] ? 'false-positive' : 'false-negative',
            similarity: row.similarity,
          })),
      ]),
    );
    const report = {
      ...common,
      category: 'executed-real-local-ai-comparison',
      realInferenceCompleted: true,
      metrics,
      strata: { supplyFamily: strata('supplyFamily'), category: strata('category') },
      pairedComparisons,
      failures,
      results,
      runtime: {
        node: process.version,
        platform: platform(),
        architecture: arch(),
        cpu: cpus()[0]?.model,
        transformers: modelRuntime.transformersVersion,
        device: 'cpu',
        threads: 2,
        coldStartupAndFirstBatchMilliseconds,
        modelLoadMilliseconds: modelMetrics.loadMilliseconds,
        sharedEmbeddingMilliseconds,
        sharedModelInferenceMilliseconds: modelMetrics.inferenceMilliseconds,
        sharedEmbeddingCalls,
        embeddedTexts: texts.length,
        sharedEmbeddingsReusedBy: ['semantic', 'combined'],
        perMethodScoringMilliseconds: scoringMilliseconds,
        statisticsMilliseconds: performance.now() - evaluationStarted,
        endToEndMilliseconds: performance.now() - started,
        timingScope:
          'Dataset validation and manifest verification precede timing; end-to-end includes model loading, embedding, method scoring and statistics, excludes report writing and model disposal.',
        baselineRssBytes: baselineRss,
        finalRssBytes: process.memoryUsage().rss,
        processPeakRssBytes: process.resourceUsage().maxRSS * 1024,
      },
    };
    if (split === 'heldout') {
      await save(
        `${options.manifestPath}.completed.json`,
        {
          schemaVersion: 1,
          completedAt: new Date().toISOString(),
          frozenManifestSha256: common.frozenManifestSha256,
          outputPath: relative(ROOT, options.outputPath),
          reportSha256: hash(`${JSON.stringify(report, null, 2)}\n`),
        },
        true,
      );
    }
    await save(options.outputPath, report);
    return report;
  } finally {
    await disposeModel();
    if (locked) await unlink(lockPath);
  }
}

function parseArgs(args: string[]): EvaluationOptions {
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (
      ![
        '--mode',
        '--dataset',
        '--annotations',
        '--output',
        '--manifest',
        '--calibration-report',
      ].includes(args[i]) ||
      !args[i + 1] ||
      values.has(args[i])
    )
      throw new Error(
        'Use --mode calibration|freeze|heldout, with optional --dataset, --annotations, --output, --manifest, --calibration-report paths',
      );
    values.set(args[i], args[i + 1]);
  }
  const mode = values.get('--mode') ?? 'calibration';
  if (!['calibration', 'freeze', 'heldout'].includes(mode))
    throw new Error('Invalid evaluation mode');
  return {
    mode: mode as EvaluationOptions['mode'],
    datasetPath: resolve(values.get('--dataset') ?? 'evaluation/cases-unlabeled.json'),
    annotationsPath: resolve(
      values.get('--annotations') ?? 'evaluation/independent-annotations.json',
    ),
    outputPath: resolve(values.get('--output') ?? `docs/evidence/ai-evaluation-${mode}.json`),
    manifestPath: resolve(values.get('--manifest') ?? 'evaluation/frozen-manifest.json'),
    calibrationPath: resolve(
      values.get('--calibration-report') ?? 'docs/evidence/ai-evaluation-calibration.json',
    ),
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await runEvaluation(parseArgs(process.argv.slice(2)));
    console.log(
      JSON.stringify(
        {
          category: report.category,
          split: report.split,
          sampleComposition: report.sampleComposition,
          metrics: report.metrics,
          runtime: report.runtime,
          failure: report.failure,
        },
        null,
        2,
      ),
    );
    if (report.category === 'blocked-local-model-unavailable') process.exitCode = 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
