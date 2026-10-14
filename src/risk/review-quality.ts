import { createReviewer, type ReviewAssessment, type ReviewRecord } from './review';
import { embedTexts } from './model';

/** Existing request facts, optional here so legacy review inputs remain readable. */
export interface QualityRecord extends ReviewRecord {
  location?: string | null;
  expenseAt?: string | null;
  amountKind?: 'exact' | 'estimate' | 'unknown';
}
import type { ReviewTier } from './review-tiers';
export type { ReviewTier } from './review-tiers';
export const QUALITY_SETTINGS = {
  version: 2,
  semanticRetrievalThreshold: 0.6,
  attentionTiers: ['needs-verification', 'strong-duplicate-evidence'],
  highPriorityTier: 'strong-duplicate-evidence',
  strongRule: 'receipt+reference+exact-amount+expense-time match; no recorded contradiction',
  verificationRule:
    'two identity clues, or one identity clue plus exact amount; contradictions prevent promotion except two matching identity clues require inspection',
  ranking: 'tier, supporting recorded matches, cosine, lexical record ID',
} as const;
export type QualityCandidate = ReviewAssessment['candidates'][number] & {
  tier: ReviewTier;
  priority: number;
  contradictions: string[];
  missing: string[];
};
export type QualityAssessment = Omit<ReviewAssessment, 'candidates'> & {
  candidates: QualityCandidate[];
};
const known = (value: string | null | undefined) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const same = (a: string | null | undefined, b: string | null | undefined) =>
  !!known(a) && known(a) === known(b);
const time = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
export function compareQualityCandidates(a: QualityCandidate, b: QualityCandidate) {
  return (
    b.priority - a.priority ||
    (b.similarity ?? -1) - (a.similarity ?? -1) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}
export function createQualityReviewer(embed: (texts: string[]) => Promise<number[][]>) {
  const legacy = createReviewer(embed);
  return async (input: QualityRecord, supplied: QualityRecord[]): Promise<QualityAssessment> => {
    const evidence = await legacy(input, supplied);
    const candidates = evidence.candidates
      .map((candidate): QualityCandidate => {
        const other = supplied.find((record) => record.id === candidate.id)!;
        const receipt = same(input.receiptDigest, other.receiptDigest);
        const reference = same(input.transactionReference, other.transactionReference);
        const exact =
          input.amountKind === 'exact' &&
          other.amountKind === 'exact' &&
          input.amountCents !== null &&
          other.amountCents !== null;
        const amount = exact && input.amountCents === other.amountCents;
        const leftTime = time(input.expenseAt),
          rightTime = time(other.expenseAt);
        const expense = leftTime !== null && rightTime !== null && leftTime === rightTime;
        const contradictions: string[] = [];
        if (known(input.transactionReference) && known(other.transactionReference) && !reference)
          contradictions.push('Different transaction references');
        if (known(input.receiptDigest) && known(other.receiptDigest) && !receipt)
          contradictions.push('Different receipt digests; separate scans can also differ');
        if (exact && !amount) contradictions.push('Different exact amounts');
        if (known(input.location) && known(other.location) && !same(input.location, other.location))
          contradictions.push('Different recorded locations');
        if (leftTime !== null && rightTime !== null && !expense)
          contradictions.push('Different recorded expense times');
        if (known(input.incident) && known(other.incident) && !same(input.incident, other.incident))
          contradictions.push('Different recorded incidents');
        const missing: string[] = [];
        if (!known(input.receiptDigest) || !known(other.receiptDigest))
          missing.push('Receipt identity unavailable');
        if (!known(input.transactionReference) || !known(other.transactionReference))
          missing.push('Transaction reference unavailable');
        if (!exact) missing.push('Exact amount corroboration unavailable');
        if (leftTime === null || rightTime === null) missing.push('Expense time unavailable');
        if (!known(input.location) || !known(other.location))
          missing.push('Location context unavailable');
        const related =
          (candidate.similarity !== null &&
            candidate.similarity >= QUALITY_SETTINGS.semanticRetrievalThreshold) ||
          same(input.description.toLowerCase(), other.description.toLowerCase()) ||
          receipt ||
          reference;
        let tier: ReviewTier = related ? 'potentially-related' : 'none';
        if (receipt && reference) tier = 'needs-verification';
        else if ((receipt || reference) && amount && contradictions.length === 0)
          tier = 'needs-verification';
        if (receipt && reference && amount && expense && contradictions.length === 0)
          tier = 'strong-duplicate-evidence';
        const rank = {
          none: 0,
          'potentially-related': 1,
          'needs-verification': 2,
          'strong-duplicate-evidence': 3,
        }[tier];
        const support = [
          receipt,
          reference,
          amount,
          expense,
          same(input.location, other.location),
        ].filter(Boolean).length;
        return {
          ...candidate,
          tier,
          priority: rank * 100 + support,
          reviewRecommended: rank >= 2,
          contradictions,
          missing,
        };
      })
      .sort(compareQualityCandidates);
    return { ...evidence, candidates };
  };
}
export const assessReviewQuality = createQualityReviewer(embedTexts);
