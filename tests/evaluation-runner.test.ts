import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  assertFrozen,
  assertHeldoutNotCompleted,
  evaluationFingerprint,
  runEvaluation,
  type EvaluationOptions,
} from '../scripts/evaluate-ai';

const record = (id: string) => ({
  id,
  incident: null,
  description: 'Synthetic water case',
  amountCents: null,
  receiptDigest: null,
  transactionReference: null,
  createdAt: '2026-10-13T00:00:00Z',
});
async function fixture(directory: string): Promise<EvaluationOptions> {
  const options: EvaluationOptions = {
    mode: 'calibration',
    datasetPath: join(directory, 'cases.json'),
    annotationsPath: join(directory, 'annotations.json'),
    outputPath: join(directory, 'report.json'),
    manifestPath: join(directory, 'manifest.json'),
    calibrationPath: join(directory, 'report.json'),
  };
  await writeFile(
    options.datasetPath,
    JSON.stringify({
      schemaVersion: 1,
      datasetId: 'manual-tests',
      provenance: 'synthetic',
      splitPolicy: 'supplyFamily disjoint',
      cases: [
        {
          id: 'cal',
          groupId: 'water',
          supplyFamily: 'water',
          category: 'manual',
          split: 'calibration',
          scenario: 'same hypothetical expense',
          left: record('a'),
          right: record('b'),
        },
        {
          id: 'held',
          groupId: 'fuel',
          supplyFamily: 'fuel',
          category: 'manual',
          split: 'heldout',
          scenario: 'same hypothetical expense',
          left: record('c'),
          right: record('d'),
        },
      ],
    }),
  );
  await writeFile(
    options.annotationsPath,
    JSON.stringify({
      schemaVersion: 1,
      datasetId: 'manual-tests',
      method: 'model-blind synthetic test labels',
      annotations: ['cal', 'held'].map((caseId) => ({
        caseId,
        decision: 'ambiguous',
        rationale: 'Not enough expense evidence',
        confidence: 'high',
      })),
    }),
  );
  return options;
}
async function withFixture(task: (directory: string, options: EvaluationOptions) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'waylatch-evaluation-'));
  try {
    await task(directory, await fixture(directory));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe('frozen heldout evaluation guards', () => {
  it('rejects changed dataset, labels, code or thresholds', () => {
    const fingerprint = {
      datasetSha256: 'dataset',
      annotationsSha256: 'annotations',
      scoringSources: [{ path: 'review.ts', sha256: 'code' }],
      settings: { threshold: 0.6 },
    };
    const frozen = {
      schemaVersion: 1,
      category: 'frozen-before-heldout-inference',
      frozenAt: '2026-10-13T00:00:00Z',
      calibrationEvidenceSha256: 'calibration',
      fingerprint,
    };
    expect(() => assertFrozen(fingerprint, frozen)).not.toThrow();
    for (const changed of [
      { ...fingerprint, datasetSha256: 'changed' },
      { ...fingerprint, annotationsSha256: 'changed' },
      { ...fingerprint, scoringSources: [{ path: 'review.ts', sha256: 'changed' }] },
      { ...fingerprint, settings: { threshold: 0.7 } },
    ])
      expect(() => assertFrozen(changed, frozen)).toThrow('changed');
    expect(() => assertFrozen(fingerprint, { fingerprint })).toThrow('manifest');
  });
  it('blocks completed report overwrite and reruns through alternate output paths', async () => {
    await withFixture(async (directory, options) => {
      await writeFile(
        options.outputPath,
        JSON.stringify({ category: 'executed-real-local-ai-comparison' }),
      );
      await expect(
        assertHeldoutNotCompleted(options.manifestPath, options.outputPath),
      ).rejects.toThrow('overwrite refused');
      await writeFile(`${options.manifestPath}.completed.json`, '{}');
      await expect(
        assertHeldoutNotCompleted(options.manifestPath, join(directory, 'alternate.json')),
      ).rejects.toThrow('already completed');
    });
  });
  it('permits a blocked report to be retried but never treats it as successful calibration', async () => {
    await withFixture(async (_directory, options) => {
      await writeFile(
        options.outputPath,
        JSON.stringify({ category: 'blocked-local-model-unavailable' }),
      );
      await expect(
        assertHeldoutNotCompleted(options.manifestPath, options.outputPath),
      ).resolves.toBeUndefined();
      await expect(runEvaluation({ ...options, mode: 'freeze' })).rejects.toThrow(
        'successful real local AI calibration',
      );
    });
  });
  it('freezes exact calibration fingerprints once and refuses overwriting a manifest', async () => {
    await withFixture(async (_directory, options) => {
      const fingerprint = await evaluationFingerprint(options.datasetPath, options.annotationsPath);
      await writeFile(
        options.outputPath,
        JSON.stringify({
          category: 'executed-real-local-ai-comparison',
          split: 'calibration',
          fingerprint,
        }),
      );
      const frozen = await runEvaluation({ ...options, mode: 'freeze' });
      expect(frozen.category).toBe('frozen-before-heldout-inference');
      await expect(runEvaluation({ ...options, mode: 'freeze' })).rejects.toMatchObject({
        code: 'EEXIST',
      });
      await writeFile(options.datasetPath, `${await readFile(options.datasetPath, 'utf8')}\n`);
      await expect(runEvaluation({ ...options, mode: 'heldout' })).rejects.toThrow('changed');
    });
  });
  it('records missing actual model assets as blocked with no fabricated metrics', async () => {
    await withFixture(async (directory, options) => {
      const previous = process.env.RESCUELEDGER_MODEL_PATH;
      try {
        process.env.RESCUELEDGER_MODEL_PATH = join(directory, 'absent-model');
        const report = await runEvaluation(options);
        expect(report).toMatchObject({
          category: 'blocked-local-model-unavailable',
          realInferenceCompleted: false,
          split: 'calibration',
          metrics: null,
          pairedComparisons: null,
          results: [],
          sampleComposition: { cases: 1 },
        });
        expect(report.failure).toContain('ENOENT');
        expect(JSON.parse(await readFile(options.outputPath, 'utf8'))).toEqual(report);
      } finally {
        if (previous === undefined) delete process.env.RESCUELEDGER_MODEL_PATH;
        else process.env.RESCUELEDGER_MODEL_PATH = previous;
      }
    });
  });
});
