import { describe, expect, it } from 'vitest';
import { assessPairs, createReviewer, type ReviewRecord } from '../src/risk/review';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MODEL_ID } from '../src/risk/model';

const record = (overrides: Partial<ReviewRecord> = {}): ReviewRecord => ({
  id: 'RL-0052',
  incident: 'FLOOD-DEMO',
  description: 'Water cases for shelter',
  amountCents: 12500,
  receiptDigest: null,
  transactionReference: null,
  createdAt: '2026-10-13T09:00:00.000Z',
  ...overrides,
});
const unavailable = async (): Promise<number[][]> => {
  throw new Error('assets absent');
};

describe('review evidence and human-only recommendations', () => {
  it('labels unavailable inference honestly while retaining exact receipt evidence', async () => {
    const assess = createReviewer(unavailable);
    const result = await assess(record({ receiptDigest: 'digest-a' }), [
      record({ id: 'RL-0048', receiptDigest: 'digest-a' }),
    ]);
    expect(result.mode).toBe('deterministic-only');
    expect(result.model).toBeNull();
    expect(result.limitation).toContain('No semantic inference');
    expect(result.candidates[0].similarity).toBeNull();
    expect(result.candidates[0].reasons).toContain('Exact receipt digest match');
    expect(result.candidates[0].reviewRecommended).toBe(true);
  });

  it('does not match unknown amounts, absent receipts, references, or incidents', async () => {
    const assess = createReviewer(unavailable);
    const result = await assess(record({ incident: null, amountCents: null }), [
      record({ id: 'RL-0048', incident: null, amountCents: null, description: 'Bus hire' }),
    ]);
    expect(result.candidates[0].reasons).toEqual(['Created within 72 hours']);
    expect(result.candidates[0].reviewRecommended).toBe(false);
  });

  it('does not treat equal amounts and temporal proximity alone as a duplicate', async () => {
    const result = await createReviewer(unavailable)(record(), [
      record({ id: 'other', description: 'Shelter generator repair' }),
    ]);
    expect(result.candidates[0].reasons).toContain('Identical amount');
    expect(result.candidates[0].reviewRecommended).toBe(false);
  });

  it('combines semantic cosine evidence with context and explains different receipts', async () => {
    // Injected vectors test scoring only; the separate benchmark executes the real model.
    const result = await createReviewer(async () => [
      [1, 0],
      [0.9, 0.1],
    ])(record({ receiptDigest: 'a' }), [
      record({
        id: 'other',
        description: 'Bottled drinking water for flood shelter',
        receiptDigest: 'b',
      }),
    ]);
    expect(result.mode).toBe('semantic-local');
    expect(result.candidates[0].similarity).toBeGreaterThan(0.9);
    expect(result.candidates[0].reasons).toContain('Semantically similar expense description');
    expect(result.candidates[0].reasons).toContain('Different receipt digest');
    expect(result.candidates[0].reviewRecommended).toBe(true);
    expect(Object.keys(result.candidates[0]).sort()).toEqual([
      'id',
      'reasons',
      'reviewRecommended',
      'similarity',
    ]);
  });

  it('does not infer duplication from semantic similarity without incident or amount context', async () => {
    const result = await createReviewer(async () => [
      [1, 0],
      [1, 0],
    ])(record({ amountCents: null }), [
      record({ id: 'other', incident: 'OTHER-DEMO', amountCents: null }),
    ]);
    expect(result.candidates[0].reviewRecommended).toBe(false);
  });

  it('excludes the input itself and bounds the inference workload', async () => {
    const assess = createReviewer(unavailable);
    expect((await assess(record(), [record()])).candidates).toEqual([]);
    await expect(
      assess(
        record(),
        Array.from({ length: 101 }, (_, i) => record({ id: `candidate-${i}` })),
      ),
    ).rejects.toThrow('100');
    await expect(assess(record({ description: 'x'.repeat(2001) }), [])).rejects.toThrow('2000');
  });

  it('rejects malformed embedding output instead of presenting successful inference', async () => {
    const result = await createReviewer(async () => [[Number.NaN], [0]])(record(), [
      record({ id: 'other' }),
    ]);
    expect(result.mode).toBe('deterministic-only');
    expect(result.candidates[0].similarity).toBeNull();
  });

  it('recommends human review for moderate semantic overlap with incident context', async () => {
    const result = await createReviewer(async () => [
      [1, 0],
      [0.65, Math.sqrt(1 - 0.65 ** 2)],
    ])(record(), [
      record({ id: 'other', description: 'Potable water cartons for displaced people' }),
    ]);
    expect(result.candidates[0].reviewRecommended).toBe(true);
  });

  it('treats corrupted local model files as unavailable instead of loading unverified weights', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rescueledger-model-'));
    const previous = process.env.RESCUELEDGER_MODEL_PATH;
    try {
      const modelDirectory = join(directory, MODEL_ID);
      await mkdir(modelDirectory, { recursive: true });
      await writeFile(join(modelDirectory, 'config.json'), '{"tampered":true}');
      process.env.RESCUELEDGER_MODEL_PATH = directory;
      const result = await assessPairs(record(), [record({ id: 'other' })]);
      expect(result.mode).toBe('deterministic-only');
      expect(result.candidates[0].similarity).toBeNull();
    } finally {
      if (previous === undefined) delete process.env.RESCUELEDGER_MODEL_PATH;
      else process.env.RESCUELEDGER_MODEL_PATH = previous;
      await rm(directory, { recursive: true, force: true });
    }
  });
});
