import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validateQualityInputs,
  qualityBinaryMetrics,
  budgetMetrics,
  tierMetrics,
  summarizeQuality,
  qualitySuccess,
  qualityPairedBootstrap,
  type QualityRow,
  type QualityCase,
} from '../src/risk/quality-evaluation';
import {
  qualityEvaluationFingerprint,
  assertQualityFrozen,
  assertQualityHeldoutNotCompleted,
  runQualityEvaluation,
  parseQualityArgs,
  type QualityEvaluationOptions,
} from '../scripts/evaluate-review-quality';

const record = (id: string) => ({
  id,
  incident: null,
  description: 'Manual synthetic unit-test expense',
  amountCents: null,
  receiptDigest: null,
  transactionReference: null,
  createdAt: '2026-10-13T00:00:00Z',
});
const sample = (id: string, family: string, split: 'calibration' | 'heldout'): QualityCase => ({
  id,
  groupId: family,
  supplyFamily: family,
  category: 'manual',
  split,
  scenario: 'Synthetic test only',
  left: record(`${id}-left`),
  right: record(`${id}-right`),
});
function inputs(
  cases = [sample('cal001', 'family-a', 'calibration'), sample('held01', 'family-b', 'heldout')],
) {
  return {
    dataset: {
      schemaVersion: 2,
      datasetId: 'synthetic-unit-test',
      provenance: 'synthetic unit fixtures',
      splitPolicy: 'family disjoint',
      cases,
    },
    annotations: {
      schemaVersion: 2,
      datasetId: 'synthetic-unit-test',
      method: 'unit fixture labels only',
      annotations: cases.map((item) => ({
        caseId: item.id,
        decision: 'ambiguous',
        evidenceTier: 'ambiguous',
        rationale: 'Synthetic identity ambiguity',
        tierRationale: 'Synthetic evidence ambiguity',
        confidence: 'low',
      })),
    },
  };
}
function row(
  id: string,
  duplicate: boolean | null,
  v1Recommended: boolean,
  tier: QualityRow['tier'],
  priority: number,
  similarity: number,
): QualityRow {
  return {
    caseId: id,
    supplyFamily: id < 'f' ? 'family-a' : 'family-b',
    category: 'manual',
    duplicate,
    v1Recommended,
    tier,
    priority,
    similarity,
    evidenceTier: tier,
  };
}
const counted = () => [
  row('a', true, true, 'strong-duplicate-evidence', 302, 0.5),
  {
    ...row('b', false, true, 'strong-duplicate-evidence', 302, 0.5),
    evidenceTier: 'needs-verification' as const,
  },
  {
    ...row('c', true, true, 'needs-verification', 202, 0.95),
    evidenceTier: 'potentially-related' as const,
  },
  row('d', false, true, 'potentially-related', 100, 0.99),
  row('e', true, true, 'potentially-related', 100, 0.9),
  row('f', false, true, 'none', 0, 0.1),
  row('g', false, false, 'none', 0, 0.8),
  row('h', true, false, 'none', 0, 0.1),
  row('i', false, false, 'none', 0, 0.1),
  row('j', false, false, 'none', 0, 0.1),
  {
    ...row('ambiguous', null, true, 'strong-duplicate-evidence', 399, 1),
    evidenceTier: 'ambiguous' as const,
  },
];

describe('v2 manually counted metrics', () => {
  it('keeps attention, strong and ambiguous identity counts separate', () => {
    const rows = counted();
    expect(qualityBinaryMetrics(rows, 'v1Combined')).toMatchObject({
      truePositives: 3,
      falsePositives: 3,
      falseNegatives: 1,
      trueNegatives: 3,
      precision: 0.5,
      recall: 0.75,
      f1: 0.6,
      falsePositiveRate: 0.5,
      alertsPer100Distinct: 50,
      ambiguousExcluded: 1,
      totalAlerts: 7,
    });
    expect(qualityBinaryMetrics(rows, 'revisedAttention')).toMatchObject({
      truePositives: 2,
      falsePositives: 1,
      falseNegatives: 2,
      trueNegatives: 5,
      precision: 2 / 3,
      recall: 0.5,
      f1: 4 / 7,
      falsePositiveRate: 1 / 6,
      totalAlerts: 4,
    });
    expect(qualityBinaryMetrics(rows, 'revisedAttention').alertsPer100Distinct).toBeCloseTo(
      100 / 6,
    );
    expect(qualityBinaryMetrics(rows, 'revisedStrong')).toMatchObject({
      truePositives: 1,
      falsePositives: 1,
      falseNegatives: 3,
      trueNegatives: 5,
      precision: 0.5,
      recall: 0.25,
      f1: 1 / 3,
    });
    expect(summarizeQuality(rows).relationships).toMatchObject({
      candidatePairs: 11,
      revisedRelatedRelationships: 6,
      v1ReturnedCandidates: 11,
      revisedReturnedCandidates: 11,
    });
  });
  it('ranks a fixed floor(20% nonambiguous pairs) budget using stable case-ID ties', () => {
    const rows = counted();
    expect(budgetMetrics(rows, 'revisedAttention')).toEqual({
      fraction: 0.2,
      eligiblePairs: 10,
      inspectedPairs: 2,
      duplicatesRetrieved: 1,
      distinctInspected: 1,
      duplicateRecall: 0.25,
      precision: 0.5,
      selectedCaseIds: ['a', 'b'],
    });
    expect(budgetMetrics([...rows].reverse(), 'revisedAttention')).toEqual(
      budgetMetrics(rows, 'revisedAttention'),
    );
    expect(budgetMetrics(rows, 'v1Combined').selectedCaseIds).toEqual(['d', 'c']);
    expect(budgetMetrics(rows.slice(0, 4), 'revisedAttention')).toMatchObject({
      inspectedPairs: 0,
      precision: null,
      duplicateRecall: 0,
    });
  });
  it('scores records-only tier labels independently and preserves ambiguous tiers', () => {
    const tiers = tierMetrics(counted());
    expect(tiers).toMatchObject({
      counts: {
        none: 5,
        'potentially-related': 2,
        'needs-verification': 1,
        'strong-duplicate-evidence': 3,
      },
      evaluated: 10,
      correct: 8,
      ambiguousExcluded: 1,
      accuracy: 0.8,
    });
    expect(tiers.confusion['needs-verification']['strong-duplicate-evidence']).toBe(1);
    expect(tiers.confusion['potentially-related']['needs-verification']).toBe(1);
    expect(tiers.confusion.none.none).toBe(5);
  });
  it('evaluates every predetermined primary criterion and fails undefined strong precision', () => {
    const rows = [
      row('a', true, true, 'needs-verification', 201, 1),
      row('b', true, false, 'none', 0, 0.1),
      row('c', false, true, 'none', 0, 1),
      row('d', false, true, 'none', 0, 0.1),
    ];
    expect(qualitySuccess(rows)).toMatchObject({
      primaryPass: true,
      relativeFPRReduction: 1,
      strongPrecisionTarget: { precision: null, pass: false },
    });
    expect(qualitySuccess(counted())).toMatchObject({
      primaryPass: false,
      criteria: {
        atLeast50PercentLowerFPR: true,
        atMost10AttentionAlertsPer100Distinct: false,
        atLeastHalfDuplicateRecall: true,
      },
    });
    expect(qualitySuccess([])).toMatchObject({ primaryPass: false, relativeFPRReduction: null });
    expect(qualityBinaryMetrics([], 'revisedAttention')).toMatchObject({
      precision: null,
      recall: null,
      falsePositiveRate: null,
      alertsPer100Distinct: null,
    });
  });
  it('reuses the seeded paired-family F1 bootstrap with explicit method remapping', () => {
    const rows = [
      row('a', true, false, 'needs-verification', 201, 0.8),
      row('b', false, false, 'none', 0, 0.1),
      { ...row('c', true, true, 'needs-verification', 201, 0.9), supplyFamily: 'family-b' },
      { ...row('d', false, true, 'none', 0, 0.1), supplyFamily: 'family-b' },
    ];
    const options = { seed: 123, iterations: 500 };
    const actual = qualityPairedBootstrap(rows, options);
    expect(actual).toEqual(qualityPairedBootstrap(rows, options));
    expect(actual).toMatchObject({
      baseline: 'v1Combined',
      comparison: 'revisedAttention',
      methodRemapping: { deterministic: 'v1Combined', combined: 'revisedAttention' },
      deltaF1: 0.5,
      groupCount: 2,
      iterations: 500,
    });
    expect(actual.deltaF195?.[0]).toBeCloseTo(1 / 3);
    expect(actual.deltaF195?.[1]).toBe(1);
    expect(actual.descriptive.falsePositiveRate).toMatchObject({
      difference: -0.5,
      validIterations: 500,
    });
    expect(actual.warning).toContain('Few independent families');
    expect(
      qualityPairedBootstrap([row('a', false, false, 'none', 0, 0.1)], { seed: 1, iterations: 10 }),
    ).toMatchObject({
      deltaF1: null,
      undefinedIterations: 10,
      descriptive: { recall: { difference: null, validIterations: 0, undefinedIterations: 10 } },
    });
  });
});

describe('v2 corpus and independent label validation', () => {
  it('accepts complete independent labels and optional existing application facts', () => {
    const { dataset, annotations } = inputs();
    Object.assign(dataset.cases[0].left, {
      location: 'East shelter',
      expenseAt: '2026-10-12T10:00:00Z',
      amountKind: 'unknown',
    });
    expect(validateQualityInputs(dataset, annotations).labels.size).toBe(2);
  });
  it('rejects source labels, unknown fields and unbounded or invalid application facts', () => {
    for (const patch of [
      { description: 'a'.repeat(2001) },
      { amountCents: -1 },
      { amountCents: 10000001 },
      { incident: 'a'.repeat(161) },
      { location: '' },
      { receiptDigest: 'fictional-but-not-sha256' },
      { transactionReference: 'x'.repeat(101) },
      { expenseAt: 'not-a-date' },
      { createdAt: '2026-02-30T00:00:00Z' },
      { id: 'tiny' },
      { decision: 'duplicate' },
      { supplier: 'unsupported' },
      { amountKind: 'exact' },
    ]) {
      const { dataset, annotations } = inputs();
      Object.assign(dataset.cases[0].left, patch);
      expect(() => validateQualityInputs(dataset, annotations)).toThrow();
    }
    const { dataset, annotations } = inputs();
    Object.assign(dataset.cases[0], { label: 'duplicate' });
    expect(() => validateQualityInputs(dataset, annotations)).toThrow('Unknown source field');
  });
  it('rejects duplicate IDs and unordered pair reuse, and disallows group/family crossing', () => {
    for (const field of ['groupId', 'supplyFamily'] as const) {
      const { dataset, annotations } = inputs();
      dataset.cases[1][field] = dataset.cases[0][field];
      expect(() => validateQualityInputs(dataset, annotations)).toThrow(`${field} crosses splits`);
    }
    const { dataset, annotations } = inputs();
    const extra = {
      ...dataset.cases[0],
      id: 'cal002',
      left: dataset.cases[0].right,
      right: dataset.cases[0].left,
    };
    dataset.cases.push(extra);
    expect(() => validateQualityInputs(dataset, annotations)).toThrow(
      'Duplicate unordered pair IDs',
    );
    dataset.cases.pop();
    dataset.cases[1].id = dataset.cases[0].id;
    expect(() => validateQualityInputs(dataset, annotations)).toThrow('Duplicate case ID');
  });
  it('requires exactly one valid identity and tier annotation for every pair', () => {
    const { dataset, annotations } = inputs();
    for (const altered of [
      { ...annotations, datasetId: 'wrong' },
      { ...annotations, annotations: annotations.annotations.slice(1) },
      { ...annotations, annotations: [...annotations.annotations, annotations.annotations[0]] },
      {
        ...annotations,
        annotations: [
          ...annotations.annotations,
          { ...annotations.annotations[0], caseId: 'unknown' },
        ],
      },
      {
        ...annotations,
        annotations: [
          { ...annotations.annotations[0], decision: 'probably' },
          annotations.annotations[1],
        ],
      },
      {
        ...annotations,
        annotations: [
          { ...annotations.annotations[0], evidenceTier: 'fraud' },
          annotations.annotations[1],
        ],
      },
      {
        ...annotations,
        annotations: [
          { ...annotations.annotations[0], tierRationale: '' },
          annotations.annotations[1],
        ],
      },
    ])
      expect(() => validateQualityInputs(dataset, altered)).toThrow();
  });
});

async function withFixture(
  task: (directory: string, options: QualityEvaluationOptions) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), 'waylatch-quality-evaluation-'));
  const options: QualityEvaluationOptions = {
    mode: 'calibration',
    datasetPath: join(directory, 'cases.json'),
    annotationsPath: join(directory, 'annotations.json'),
    outputPath: join(directory, 'calibration-report.json'),
    calibrationPath: join(directory, 'calibration-report.json'),
    manifestPath: join(directory, 'frozen-manifest.json'),
  };
  try {
    const input = inputs();
    await writeFile(options.datasetPath, JSON.stringify(input.dataset));
    await writeFile(options.annotationsPath, JSON.stringify(input.annotations));
    await task(directory, options);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
describe('v2 freeze and runtime guards (synthetic fixtures only)', () => {
  it('defaults every artifact to the separate v2 directory', () => {
    const options = parseQualityArgs(['--mode', 'heldout']);
    expect(options.outputPath).toBe(resolve('evaluation/review-quality-v2/heldout-report.json'));
    expect(options.manifestPath).toBe(resolve('evaluation/review-quality-v2/frozen-manifest.json'));
    expect(() => parseQualityArgs(['--mode', 'heldout', '--mode', 'calibration'])).toThrow();
  });
  it('hashes final dependencies, protocol, all score sources, dataset and labels', async () => {
    await withFixture(async (_directory, options) => {
      const fingerprint = await qualityEvaluationFingerprint(
        options.datasetPath,
        options.annotationsPath,
      );
      expect(fingerprint.scoringSources.map((item) => item.path)).toEqual(
        expect.arrayContaining([
          'src/risk/review-quality.ts',
          'src/risk/review-tiers.ts',
          'src/risk/review.ts',
          'src/risk/evaluation.ts',
          'src/risk/model.ts',
          'src/risk/model-assets.ts',
          'scripts/evaluate-review-quality.ts',
          'src/risk/quality-evaluation.ts',
          'evaluation/review-quality-v2/PROTOCOL.md',
          'package.json',
          'package-lock.json',
        ]),
      );
      for (const source of fingerprint.scoringSources)
        expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
      const manifest = {
        schemaVersion: 2,
        category: 'quality-v2-frozen-before-heldout-inference',
        frozenAt: '2026-10-13T00:00:00Z',
        calibrationEvidenceSha256: 'calibration',
        fingerprint,
      };
      expect(() => assertQualityFrozen(fingerprint, manifest)).not.toThrow();
      for (const changed of [
        { ...fingerprint, datasetSha256: 'changed' },
        { ...fingerprint, annotationsSha256: 'changed' },
        { ...fingerprint, settings: {} },
        { ...fingerprint, scoringSources: [] },
      ])
        expect(() => assertQualityFrozen(changed, manifest)).toThrow('changed');
      expect(() => assertQualityFrozen(fingerprint, { ...manifest, schemaVersion: 1 })).toThrow(
        'valid v2',
      );
      await writeFile(options.datasetPath, `${await readFile(options.datasetPath, 'utf8')}\n`);
      expect(
        (await qualityEvaluationFingerprint(options.datasetPath, options.annotationsPath))
          .datasetSha256,
      ).not.toBe(fingerprint.datasetSha256);
    });
  });
  it('freezes a matching successful calibration exclusively and checks evidence bytes', async () => {
    await withFixture(async (directory, options) => {
      const fingerprint = await qualityEvaluationFingerprint(
        options.datasetPath,
        options.annotationsPath,
      );
      // A constructed report tests manifest mechanics only; no actual predictions or inference are executed.
      await writeFile(
        options.calibrationPath,
        JSON.stringify({
          category: 'executed-real-local-quality-comparison',
          realInferenceCompleted: true,
          split: 'calibration',
          datasetId: 'synthetic-unit-test',
          fingerprint,
        }),
      );
      const manifest = await runQualityEvaluation({ ...options, mode: 'freeze' });
      expect(manifest.category).toBe('quality-v2-frozen-before-heldout-inference');
      await expect(runQualityEvaluation({ ...options, mode: 'freeze' })).rejects.toMatchObject({
        code: 'EEXIST',
      });
      await writeFile(
        options.calibrationPath,
        `${await readFile(options.calibrationPath, 'utf8')}\n`,
      );
      await expect(
        runQualityEvaluation({
          ...options,
          mode: 'heldout',
          outputPath: join(directory, 'heldout.json'),
        }),
      ).rejects.toThrow('Calibration evidence changed');
    });
  });
  it('rejects v1 artifact destinations and blocked/unsuccessful calibration evidence', async () => {
    await withFixture(async (_directory, options) => {
      await expect(
        runQualityEvaluation({
          ...options,
          outputPath: resolve('docs/evidence/ai-evaluation-heldout.json'),
        }),
      ).rejects.toThrow('V1 evaluation artifacts');
      await expect(
        runQualityEvaluation({
          ...options,
          manifestPath: resolve('evaluation/frozen-manifest.json'),
        }),
      ).rejects.toThrow('V1 evaluation artifacts');
      await writeFile(
        options.calibrationPath,
        JSON.stringify({ category: 'blocked-local-model-unavailable' }),
      );
      await expect(runQualityEvaluation({ ...options, mode: 'freeze' })).rejects.toThrow(
        'successful real local v2 calibration',
      );
    });
  });
  it('blocks completed reruns even through alternate output paths', async () => {
    await withFixture(async (directory, options) => {
      await writeFile(
        options.outputPath,
        JSON.stringify({ category: 'executed-real-local-quality-comparison' }),
      );
      await expect(
        assertQualityHeldoutNotCompleted(options.manifestPath, options.outputPath),
      ).rejects.toThrow('overwrite refused');
      await writeFile(`${options.manifestPath}.completed.json`, '{}');
      await expect(
        assertQualityHeldoutNotCompleted(options.manifestPath, join(directory, 'alternate.json')),
      ).rejects.toThrow('already completed');
    });
  });
  it('honors an existing exclusive heldout lock before model inference', async () => {
    await withFixture(async (directory, options) => {
      const fingerprint = await qualityEvaluationFingerprint(
        options.datasetPath,
        options.annotationsPath,
      );
      await writeFile(
        options.calibrationPath,
        JSON.stringify({
          category: 'executed-real-local-quality-comparison',
          realInferenceCompleted: true,
          split: 'calibration',
          datasetId: 'synthetic-unit-test',
          fingerprint,
        }),
      );
      await runQualityEvaluation({ ...options, mode: 'freeze' });
      await writeFile(`${options.manifestPath}.running`, 'existing exclusive unit-test lock');
      await expect(
        runQualityEvaluation({
          ...options,
          mode: 'heldout',
          outputPath: join(directory, 'heldout.json'),
        }),
      ).rejects.toMatchObject({ code: 'EEXIST' });
      expect(await readFile(`${options.manifestPath}.running`, 'utf8')).toBe(
        'existing exclusive unit-test lock',
      );
    });
  });
  it('blocks missing pinned assets with no invented embeddings or measurements', async () => {
    await withFixture(async (directory, options) => {
      const previous = process.env.RESCUELEDGER_MODEL_PATH;
      try {
        process.env.RESCUELEDGER_MODEL_PATH = join(directory, 'missing-assets');
        const report = await runQualityEvaluation(options);
        expect(report).toMatchObject({
          category: 'blocked-local-model-unavailable',
          realInferenceCompleted: false,
          metrics: null,
          pairedComparisons: null,
          results: [],
          sampleComposition: { cases: 1 },
          runtime: { completedEmbeddingVectors: 0 },
        });
        expect(report.failure).toContain('ENOENT');
        expect(JSON.parse(await readFile(options.outputPath, 'utf8'))).toEqual(report);
        await expect(
          assertQualityHeldoutNotCompleted(options.manifestPath, options.outputPath),
        ).resolves.toBeUndefined();
      } finally {
        if (previous === undefined) delete process.env.RESCUELEDGER_MODEL_PATH;
        else process.env.RESCUELEDGER_MODEL_PATH = previous;
      }
    });
  });
});
