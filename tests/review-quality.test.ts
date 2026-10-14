import { describe, expect, it } from 'vitest';
import {
  createQualityReviewer,
  compareQualityCandidates,
  type QualityRecord,
} from '../src/risk/review-quality';
const base: QualityRecord = {
  id: 'QUALITY-A',
  description: 'Ice storage rental at Harbor depot',
  incident: 'STORM-31',
  amountCents: 25000,
  amountKind: 'exact',
  location: 'Harbor depot',
  createdAt: '2026-10-14T10:00:00.000Z',
  expenseAt: '2026-10-14T09:00:00.000Z',
  receiptDigest: null,
  transactionReference: null,
};
const unavailable = async (): Promise<number[][]> => {
  throw new Error('unavailable');
};
const similar = async (texts: string[]) => texts.map(() => [1, 0]);
const pair = async (
  left: Partial<QualityRecord> = {},
  right: Partial<QualityRecord> = {},
  embed = similar,
) =>
  (
    await createQualityReviewer(embed)({ ...base, ...left }, [
      { ...base, id: 'QUALITY-B', ...right },
    ])
  ).candidates[0];
describe('transaction evidence versus related language', () => {
  it('keeps identical wording and shared incident/price informational without transaction identity', async () => {
    const result = await pair();
    expect(result.tier).toBe('potentially-related');
    expect(result.reviewRecommended).toBe(false);
    expect(result.missing).toContain('Receipt identity unavailable');
  });
  it('does not elevate a consolidated receipt with separate order references and amounts', async () => {
    const result = await pair(
      { receiptDigest: 'a'.repeat(64), transactionReference: 'ORDER-A' },
      { receiptDigest: 'a'.repeat(64), transactionReference: 'ORDER-B', amountCents: 32000 },
    );
    expect(result.tier).toBe('potentially-related');
    expect(result.contradictions).toContain('Different transaction references');
    expect(result.contradictions).toContain('Different exact amounts');
  });
  it('recognizes multiple corroborating transaction facts without requiring similar language', async () => {
    const result = await pair(
      { receiptDigest: 'a'.repeat(64), transactionReference: 'ORDER-31' },
      {
        receiptDigest: 'a'.repeat(64),
        transactionReference: 'ORDER-31',
        description: 'Reimbursement of cold room charge',
      },
      unavailable,
    );
    expect(result.tier).toBe('strong-duplicate-evidence');
    expect(result.reviewRecommended).toBe(true);
  });
  it('downgrades conflicting locations even when receipt and reference match', async () => {
    const result = await pair(
      { receiptDigest: 'a'.repeat(64), transactionReference: 'DOC-31' },
      { receiptDigest: 'a'.repeat(64), transactionReference: 'DOC-31', location: 'Upland depot' },
    );
    expect(result.tier).toBe('needs-verification');
    expect(result.contradictions).toContain('Different recorded locations');
  });
  it('does not treat a price estimate as exact corroboration', async () => {
    const result = await pair(
      { receiptDigest: 'a'.repeat(64), transactionReference: 'DOC-31', amountKind: 'estimate' },
      { receiptDigest: 'a'.repeat(64), transactionReference: 'DOC-31' },
    );
    expect(result.tier).not.toBe('strong-duplicate-evidence');
    expect(result.missing).toContain('Exact amount corroboration unavailable');
  });
  it('keeps a recurring purchase with a different expense time informational', async () => {
    const result = await pair({}, { expenseAt: '2026-10-21T09:00:00.000Z' });
    expect(result.tier).toBe('potentially-related');
    expect(result.contradictions).toContain('Different recorded expense times');
    expect(result.reviewRecommended).toBe(false);
  });
  it('returns no relationship for unrelated language without transaction clues', async () => {
    const result = await pair({}, { description: 'Seedling trays' }, async () => [
      [1, 0],
      [0, 1],
    ]);
    expect(result.tier).toBe('none');
  });
  it('orders corroborated candidates before informational similarities and breaks ties by ID', async () => {
    const result = await createQualityReviewer(similar)(
      { ...base, receiptDigest: 'a'.repeat(64), transactionReference: 'ORDER-31' },
      [
        { ...base, id: 'ZZ-INFO' },
        {
          ...base,
          id: 'AA-STRONG',
          receiptDigest: 'a'.repeat(64),
          transactionReference: 'ORDER-31',
        },
        { ...base, id: 'BB-INFO' },
      ],
    );
    expect(result.candidates.map((x) => x.id)).toEqual(['AA-STRONG', 'BB-INFO', 'ZZ-INFO']);
    expect([...result.candidates].sort(compareQualityCandidates)).toEqual(result.candidates);
  });
});
