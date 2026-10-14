import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, unlink, access } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus, platform, arch } from 'node:os';
import { createReviewer, type ReviewAssessment } from '../src/risk/review';
import {
  createQualityReviewer,
  QUALITY_SETTINGS,
  type QualityCandidate,
} from '../src/risk/review-quality';
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
  validateQualityInputs,
  summarizeQuality,
  qualitySuccess,
  qualityPairedBootstrap,
  predicted,
  type QualityRow,
  type QualityCase,
  type QualityAnnotation,
} from '../src/risk/quality-evaluation';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'evaluation/review-quality-v2';
export const QUALITY_SCORING_FILES = [
  'scripts/evaluate-review-quality.ts',
  'src/risk/quality-evaluation.ts',
  'src/risk/review-quality.ts',
  'src/risk/review-tiers.ts',
  'src/risk/review.ts',
  'src/risk/evaluation.ts',
  'src/risk/model.ts',
  'src/risk/model-assets.ts',
  'package.json',
  'package-lock.json',
  `${BASE}/PROTOCOL.md`,
];
export const QUALITY_EVALUATION_SETTINGS = {
  model: MODEL_ID,
  revision: MODEL_REVISION,
  dtype: 'q8',
  device: 'cpu',
  embeddingDimensions: 384,
  maximumTextsPerEmbeddingCall: 100,
  remoteModelsAllowed: false,
  intraOpThreads: 2,
  interOpThreads: 1,
  assets: MODEL_ASSETS,
  quality: QUALITY_SETTINGS,
  methods: ['v1Combined', 'revisedAttention', 'revisedStrong'],
  budgetFraction: 0.2,
  bootstrap: { seed: 20261013, iterations: 10000, unit: 'supplyFamily' },
  success: {
    minimumFPRReduction: 0.5,
    maximumAttentionAlertsPer100Distinct: 10,
    minimumDuplicateRecall: 0.5,
    strongPrecisionTarget: 0.8,
  },
};
interface QualityResult extends QualityRow {
  groupId: string;
  scenario: string;
  left: QualityCase['left'];
  right: QualityCase['right'];
  annotation: QualityAnnotation;
  v1: ReviewAssessment['candidates'][number];
  revised: QualityCandidate;
}
export interface QualityEvaluationOptions {
  mode: 'calibration' | 'freeze' | 'heldout';
  datasetPath: string;
  annotationsPath: string;
  outputPath: string;
  manifestPath: string;
  calibrationPath: string;
}
const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const json = async (path: string): Promise<Record<string, unknown>> => {
  const bytes = await readFile(path);
  if (bytes.length > 16 * 1024 * 1024) throw new Error('Evaluation JSON exceeds 16 MiB bound');
  return JSON.parse(bytes.toString('utf8'));
};
async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
async function save(path: string, value: unknown, exclusive = false) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: exclusive ? 'wx' : 'w' });
}
export async function qualityEvaluationFingerprint(datasetPath: string, annotationsPath: string) {
  return {
    datasetSha256: hash(await readFile(datasetPath)),
    annotationsSha256: hash(await readFile(annotationsPath)),
    scoringSources: await Promise.all(
      QUALITY_SCORING_FILES.map(async (path) => ({
        path,
        sha256: hash(await readFile(resolve(ROOT, path))),
      })),
    ),
    settings: QUALITY_EVALUATION_SETTINGS,
  };
}
export function assertQualityFrozen(fingerprint: unknown, frozen: Record<string, unknown>) {
  if (
    frozen.schemaVersion !== 2 ||
    frozen.category !== 'quality-v2-frozen-before-heldout-inference' ||
    typeof frozen.frozenAt !== 'string' ||
    typeof frozen.calibrationEvidenceSha256 !== 'string'
  )
    throw new Error('A valid v2 pre-inference frozen manifest is required');
  if (JSON.stringify(fingerprint) !== JSON.stringify(frozen.fingerprint))
    throw new Error(
      'Frozen v2 dataset, annotations, code, dependencies, protocol or settings changed; heldout refused',
    );
}
export async function assertQualityHeldoutNotCompleted(manifestPath: string, outputPath: string) {
  if (await exists(`${manifestPath}.completed.json`))
    throw new Error('V2 heldout evaluation already completed; rerun refused');
  if (
    (await exists(outputPath)) &&
    (await json(outputPath)).category !== 'blocked-local-model-unavailable'
  )
    throw new Error('V2 heldout output already exists; overwrite refused');
}
function assertPaths(options: QualityEvaluationOptions) {
  if (!['calibration', 'freeze', 'heldout'].includes(options.mode))
    throw new Error('Invalid evaluation mode');
  const protectedPaths = new Set([
    ...QUALITY_SCORING_FILES.map((path) => resolve(ROOT, path)),
    resolve(options.datasetPath),
    resolve(options.annotationsPath),
  ]);
  const outputs = [
    options.outputPath,
    options.manifestPath,
    `${options.manifestPath}.completed.json`,
    `${options.manifestPath}.running`,
  ].map((path) => resolve(path));
  if (new Set(outputs).size !== outputs.length || outputs.some((path) => protectedPaths.has(path)))
    throw new Error('Output/manifest paths must be distinct from source and input files');
  if (
    resolve(options.manifestPath) === resolve(options.calibrationPath) ||
    (options.mode === 'heldout' && resolve(options.outputPath) === resolve(options.calibrationPath))
  )
    throw new Error('Heldout and manifest must preserve calibration evidence');
  for (const path of outputs) {
    const name = relative(ROOT, path).replaceAll('\\', '/');
    if (
      (name.startsWith('evaluation/') && !name.startsWith(`${BASE}/`)) ||
      /^docs\/evidence\/ai-evaluation/.test(name)
    )
      throw new Error('V1 evaluation artifacts are protected; choose v2 output paths');
  }
}
export const HISTORICAL_V1_RESULT = {
  purpose:
    'Preserved unfavorable original v1 heldout result; historical reference on a different corpus, not the same-dataset controlled v2 baseline.',
  artifact: 'docs/evidence/ai-evaluation-heldout.json',
  receipt: 'evaluation/frozen-manifest.json.completed.json',
  evaluated: 152,
  methods: {
    deterministic: {
      truePositives: 32,
      falsePositives: 16,
      falseNegatives: 48,
      trueNegatives: 56,
      precision: 32 / 48,
      recall: 0.4,
      f1: 0.5,
    },
    semantic: {
      truePositives: 62,
      falsePositives: 70,
      falseNegatives: 18,
      trueNegatives: 2,
      precision: 62 / 132,
      recall: 0.775,
      f1: 124 / 212,
    },
    combined: {
      truePositives: 57,
      falsePositives: 70,
      falseNegatives: 23,
      trueNegatives: 2,
      precision: 57 / 127,
      recall: 0.7125,
      f1: 114 / 207,
      falsePositiveRate: 70 / 72,
    },
  },
};
const LIMITATIONS = [
  'New fictional synthetic pairs with nonexpert model-blind AI annotations, subjective confidence and retained ambiguity; not real-field or human-adjudicated truth.',
  'Binary transaction identity and independently annotated records-only evidence tiers are different targets. Scenario-only facts are unavailable to either predictor.',
  'Few supply-family clusters and common author templates make paired bootstrap intervals exploratory. Case-level Wilson intervals ignore cluster dependence.',
  'Balanced synthetic sampling does not estimate real prevalence, operational workload or fraud probability. All tiers remain advisory; no approval, rejection or payment action occurs.',
  'The fixed 20% global pair budget is a bounded surrogate, not a multi-candidate retrieval benchmark; no MAP/NDCG claim. Workload counts are not human minutes.',
  'Application risk API supplies at most 100 candidates, currently truncates stored candidates in storage order before revised tier ranking. This pairwise evaluator supplies one candidate and has no candidate truncation; global ranking has deterministic case-ID ties.',
  'Methods share genuine pinned local CPU embeddings. Per-method scoring excludes shared model work. Host timing does not establish browser/mobile performance.',
];
export async function runQualityEvaluation(
  options: QualityEvaluationOptions,
): Promise<Record<string, unknown>> {
  assertPaths(options);
  const input = validateQualityInputs(
    await json(options.datasetPath),
    await json(options.annotationsPath),
  );
  const fingerprint = await qualityEvaluationFingerprint(
    options.datasetPath,
    options.annotationsPath,
  );
  if (options.mode === 'freeze') {
    const calibration = await json(options.calibrationPath);
    if (
      calibration.category !== 'executed-real-local-quality-comparison' ||
      calibration.realInferenceCompleted !== true ||
      calibration.split !== 'calibration' ||
      calibration.datasetId !== input.datasetId ||
      JSON.stringify(calibration.fingerprint) !== JSON.stringify(fingerprint)
    )
      throw new Error(
        'Freeze requires successful real local v2 calibration with identical fingerprint',
      );
    const frozen = {
      schemaVersion: 2,
      category: 'quality-v2-frozen-before-heldout-inference',
      datasetId: input.datasetId,
      frozenAt: new Date().toISOString(),
      fingerprint,
      calibrationEvidenceSha256: hash(await readFile(options.calibrationPath)),
      selection:
        'Final revised tier strategy and predetermined protocol targets frozen before heldout predictions.',
      limitations: LIMITATIONS,
    };
    await save(options.manifestPath, frozen, true);
    return frozen;
  }
  const split = options.mode,
    cases = input.cases.filter((item) => item.split === split);
  if (!cases.length) throw new Error(`No ${split} cases`);
  let frozen: Record<string, unknown> | null = null,
    locked = false,
    consumedRealVectors = false,
    completed = false;
  const lockPath = `${options.manifestPath}.running`;
  if (split === 'heldout') {
    frozen = await json(options.manifestPath);
    assertQualityFrozen(fingerprint, frozen);
    if (hash(await readFile(options.calibrationPath)) !== frozen.calibrationEvidenceSha256)
      throw new Error('Calibration evidence changed after freeze');
    await assertQualityHeldoutNotCompleted(options.manifestPath, options.outputPath);
    await save(
      lockPath,
      {
        pid: process.pid,
        startedAt: new Date().toISOString(),
        policy:
          'Exclusive heldout lock persists after a partial/scoring failure. Never delete it for a rerun.',
      },
      true,
    );
    locked = true;
    try {
      await assertQualityHeldoutNotCompleted(options.manifestPath, options.outputPath);
    } catch (error) {
      await unlink(lockPath);
      throw error;
    }
  }
  const started = performance.now(),
    baselineRss = process.memoryUsage().rss,
    inferenceMillisecondsBefore = modelMetrics.inferenceMilliseconds,
    inferenceBatchesBefore = modelMetrics.inferenceBatches;
  const decisions = { duplicate: 0, distinct: 0, ambiguous: 0 },
    familyCounts: Record<string, number> = Object.create(null),
    categoryCounts: Record<string, number> = Object.create(null);
  for (const item of cases) {
    decisions[input.labels.get(item.id)!.decision]++;
    familyCounts[item.supplyFamily] = (familyCounts[item.supplyFamily] ?? 0) + 1;
    categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
  }
  const common = {
    schemaVersion: 2,
    datasetId: input.datasetId,
    split,
    executedAt: new Date().toISOString(),
    fingerprint,
    provenance: input.provenance,
    annotationMethod: input.method,
    historicalV1: HISTORICAL_V1_RESULT,
    splitPolicy: input.splitPolicy,
    sampleComposition: {
      cases: cases.length,
      familyCount: Object.keys(familyCounts).length,
      families: familyCounts,
      categories: categoryCounts,
      decisions,
    },
    frozenManifestSha256: frozen ? hash(await readFile(options.manifestPath)) : null,
    metricsInterpretation:
      split === 'calibration'
        ? 'Calibration only; no heldout performance claim.'
        : 'One heldout evaluation of frozen settings on this synthetic grouped split.',
    limitations: LIMITATIONS,
  };
  try {
    const texts = [
      ...new Set(cases.flatMap((item) => [item.left.description, item.right.description])),
    ];
    const vectors = new Map<string, number[]>();
    const embeddingStarted = performance.now();
    let embeddingCalls = 0,
      coldStartupAndFirstBatchMilliseconds: number | null = null;
    try {
      for (let offset = 0; offset < texts.length; offset += 100) {
        const batch = texts.slice(offset, offset + 100),
          batchStarted = performance.now();
        const result = await embedTexts(batch);
        consumedRealVectors = true;
        if (
          result.length !== batch.length ||
          result.some(
            (vector) =>
              vector.length !== 384 ||
              !vector.every(Number.isFinite) ||
              !vector.some((value) => value !== 0),
          )
        )
          throw new Error(
            'Invalid genuine embedding output: expected finite nonzero 384 dimensions',
          );
        if (offset === 0) coldStartupAndFirstBatchMilliseconds = performance.now() - batchStarted;
        embeddingCalls++;
        batch.forEach((text, index) => vectors.set(text, result[index]));
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
          sharedEmbeddingCallsCompleted: embeddingCalls,
          completedEmbeddingVectors: vectors.size,
          heldoutLockRetained: locked && consumedRealVectors,
        },
      };
      await save(options.outputPath, report);
      return report;
    }
    const sharedEmbeddingMilliseconds = performance.now() - embeddingStarted;
    const cachedEmbedding = async (requested: string[]) =>
      requested.map((text) => {
        const vector = vectors.get(text);
        if (!vector) throw new Error('Scorer requested text absent from genuine embedding cache');
        return vector;
      });
    const baseline = createReviewer(cachedEmbedding),
      revised = createQualityReviewer(cachedEmbedding);
    const scoringMilliseconds = { v1Combined: 0, revised: 0 };
    const rows: QualityRow[] = [],
      results: QualityResult[] = [];
    for (const item of cases) {
      let time = performance.now();
      const old = await baseline(item.left, [item.right]);
      scoringMilliseconds.v1Combined += performance.now() - time;
      time = performance.now();
      const current = await revised(item.left, [item.right]);
      scoringMilliseconds.revised += performance.now() - time;
      const a = old.candidates[0],
        b = current.candidates[0];
      if (
        old.mode !== 'semantic-local' ||
        current.mode !== 'semantic-local' ||
        old.candidates.length !== 1 ||
        current.candidates.length !== 1 ||
        a.id !== item.right.id ||
        b.id !== item.right.id ||
        a.similarity === null ||
        b.similarity === null ||
        !Number.isFinite(a.similarity) ||
        !Number.isFinite(b.similarity) ||
        Math.abs(a.similarity - b.similarity) > 1e-10 ||
        !Number.isFinite(b.priority)
      )
        throw new Error('Real shared-vector scorer comparison failed or used fallback');
      const annotation = input.labels.get(item.id)!;
      const row: QualityRow = {
        caseId: item.id,
        supplyFamily: item.supplyFamily,
        category: item.category,
        duplicate: annotation.decision === 'ambiguous' ? null : annotation.decision === 'duplicate',
        evidenceTier: annotation.evidenceTier,
        similarity: a.similarity,
        v1Recommended: a.reviewRecommended,
        tier: b.tier,
        priority: b.priority,
      };
      if (b.reviewRecommended !== predicted(row, 'revisedAttention'))
        throw new Error(
          'Revised review flag must equal needs-verification OR strong-duplicate-evidence',
        );
      rows.push(row);
      results.push({
        ...row,
        groupId: item.groupId,
        scenario: item.scenario,
        left: item.left,
        right: item.right,
        annotation,
        v1: a,
        revised: b,
      });
    }
    const statisticsStarted = performance.now();
    const metrics = summarizeQuality(rows),
      success = qualitySuccess(rows),
      pairedComparisons = qualityPairedBootstrap(rows);
    const strata = (key: 'supplyFamily' | 'category') =>
      Object.fromEntries(
        [...new Set(rows.map((row) => row[key]))]
          .sort()
          .map((value) => [value, summarizeQuality(rows.filter((row) => row[key] === value))]),
      );
    const failures = {
      binary: Object.fromEntries(
        (['v1Combined', 'revisedAttention', 'revisedStrong'] as const).map((method) => [
          method,
          results
            .filter((row) => row.duplicate !== null && predicted(row, method) !== row.duplicate)
            .map((row) => ({
              caseId: row.caseId,
              category: row.category,
              supplyFamily: row.supplyFamily,
              failure: predicted(row, method) ? 'false-positive' : 'false-negative',
              annotation: row.annotation,
              similarity: row.similarity,
              v1: row.v1,
              revised: row.revised,
            })),
        ]),
      ),
      tier: results
        .filter((row) => row.evidenceTier !== 'ambiguous' && row.tier !== row.evidenceTier)
        .map((row) => ({
          caseId: row.caseId,
          annotated: row.evidenceTier,
          predicted: row.tier,
          rationale: row.annotation.tierRationale,
        })),
    };
    const report = {
      ...common,
      category: 'executed-real-local-quality-comparison',
      realInferenceCompleted: true,
      metrics,
      success,
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
        sharedModelInferenceMilliseconds:
          modelMetrics.inferenceMilliseconds - inferenceMillisecondsBefore,
        sharedModelInferenceBatches: modelMetrics.inferenceBatches - inferenceBatchesBefore,
        sharedEmbeddingCalls: embeddingCalls,
        embeddedUniqueTexts: texts.length,
        candidateTextOccurrences: cases.length * 2,
        sharedEmbeddingsReusedBy: ['v1Combined', 'revised'],
        perMethodScoringMilliseconds: scoringMilliseconds,
        statisticsMilliseconds: performance.now() - statisticsStarted,
        endToEndMilliseconds: performance.now() - started,
        timingScope:
          'Validation/fingerprinting precedes timing. Includes shared loading/inference/scoring/statistics; excludes report write/disposal.',
        baselineRssBytes: baselineRss,
        finalRssBytes: process.memoryUsage().rss,
        processPeakRssBytes: process.resourceUsage().maxRSS * 1024,
      },
    };
    if (split === 'heldout') {
      await save(
        `${options.manifestPath}.completed.json`,
        {
          schemaVersion: 2,
          completedAt: new Date().toISOString(),
          frozenManifestSha256: common.frozenManifestSha256,
          outputPath: relative(ROOT, options.outputPath),
          reportSha256: hash(`${JSON.stringify(report, null, 2)}\n`),
        },
        true,
      );
      completed = true;
    }
    await save(options.outputPath, report);
    return report;
  } finally {
    await disposeModel();
    if (locked && (!consumedRealVectors || completed)) await unlink(lockPath);
  }
}
export function parseQualityArgs(args: string[]): QualityEvaluationOptions {
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
        'Use --mode calibration|freeze|heldout and optional --dataset, --annotations, --output, --manifest, --calibration-report',
      );
    values.set(args[i], args[i + 1]);
  }
  const mode = values.get('--mode') ?? 'calibration';
  if (!['calibration', 'freeze', 'heldout'].includes(mode))
    throw new Error('Invalid evaluation mode');
  return {
    mode: mode as QualityEvaluationOptions['mode'],
    datasetPath: resolve(values.get('--dataset') ?? `${BASE}/cases.json`),
    annotationsPath: resolve(values.get('--annotations') ?? `${BASE}/annotations.json`),
    outputPath: resolve(values.get('--output') ?? `${BASE}/${mode}-report.json`),
    manifestPath: resolve(values.get('--manifest') ?? `${BASE}/frozen-manifest.json`),
    calibrationPath: resolve(
      values.get('--calibration-report') ?? `${BASE}/calibration-report.json`,
    ),
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await runQualityEvaluation(parseQualityArgs(process.argv.slice(2)));
    console.log(
      JSON.stringify(
        {
          category: report.category,
          split: report.split,
          sampleComposition: report.sampleComposition,
          metrics: report.metrics,
          success: report.success,
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
