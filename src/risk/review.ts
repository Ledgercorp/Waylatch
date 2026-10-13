export interface ReviewRecord {
  id: string;
  incident: string | null;
  description: string;
  amountCents: number | null;
  receiptDigest: string | null;
  transactionReference: string | null;
  createdAt: string;
}
import { embedTexts, MODEL_ID } from './model';

// Calibrated on a tiny synthetic fixture set; flags review, never a fraud determination.
export const SEMANTIC_THRESHOLD = 0.6;
export interface ReviewAssessment {
  mode: 'semantic-local' | 'deterministic-only';
  model: string | null;
  candidates: Array<{
    id: string;
    similarity: number | null;
    reasons: string[];
    reviewRecommended: boolean;
  }>;
  limitation?: string;
}

function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length || !a.every(Number.isFinite) || !b.every(Number.isFinite))
    throw new Error('Invalid embedding');
  let dot = 0,
    magnitudeA = 0,
    magnitudeB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magnitudeA += a[i] ** 2;
    magnitudeB += b[i] ** 2;
  }
  if (!magnitudeA || !magnitudeB) throw new Error('Invalid embedding');
  return Math.max(-1, Math.min(1, dot / Math.sqrt(magnitudeA * magnitudeB)));
}

function sameKnown(a: string | null, b: string | null): boolean {
  return typeof a === 'string' && a.trim().length > 0 && a === b;
}

export function createReviewer(embed: (texts: string[]) => Promise<number[][]>) {
  return async (input: ReviewRecord, supplied: ReviewRecord[]): Promise<ReviewAssessment> => {
    if (supplied.length > 100) throw new Error('At most 100 review candidates allowed');
    if ([input, ...supplied].some((r) => !r.description.trim() || r.description.length > 2000))
      throw new Error('Description must contain 1 to 2000 characters');
    const candidates = supplied.filter((r) => r.id !== input.id);
    let similarities: number[] | null = null;
    if (candidates.length) {
      try {
        const vectors = await embed([input.description, ...candidates.map((r) => r.description)]);
        if (vectors.length !== candidates.length + 1) throw new Error('Missing embeddings');
        similarities = candidates.map((_, i) => cosine(vectors[0], vectors[i + 1]));
      } catch {
        /* Deliberately preserve deterministic evidence, without claiming AI inference. */
      }
    }
    return {
      mode: similarities ? 'semantic-local' : 'deterministic-only',
      model: similarities ? MODEL_ID : null,
      ...(similarities
        ? {}
        : {
            limitation:
              'No semantic inference executed. Local model assets or runtime are unavailable, or no comparison candidates exist. Deterministic evidence only.',
          }),
      candidates: candidates.map((candidate, i) => {
        const reasons: string[] = [];
        const incident = sameKnown(input.incident, candidate.incident);
        const amount =
          input.amountCents !== null &&
          candidate.amountCents !== null &&
          Number.isSafeInteger(input.amountCents) &&
          input.amountCents === candidate.amountCents;
        const receipt = sameKnown(input.receiptDigest, candidate.receiptDigest);
        const transaction = sameKnown(input.transactionReference, candidate.transactionReference);
        const identicalDescription =
          input.description.trim().toLowerCase() === candidate.description.trim().toLowerCase();
        const similarity = similarities?.[i] ?? null;
        const semantic = similarity !== null && similarity >= SEMANTIC_THRESHOLD;
        if (incident) reasons.push('Same incident');
        if (amount) reasons.push('Identical amount');
        if (receipt) reasons.push('Exact receipt digest match');
        else if (input.receiptDigest && candidate.receiptDigest)
          reasons.push('Different receipt digest');
        if (transaction) reasons.push('Repeated transaction reference');
        const delta = Math.abs(Date.parse(input.createdAt) - Date.parse(candidate.createdAt));
        if (Number.isFinite(delta) && delta <= 72 * 60 * 60 * 1000)
          reasons.push('Created within 72 hours');
        if (semantic) reasons.push('Semantically similar expense description');
        if (identicalDescription) reasons.push('Identical expense description');
        return {
          id: candidate.id,
          similarity,
          reasons,
          reviewRecommended:
            receipt || transaction || ((semantic || identicalDescription) && (incident || amount)),
        };
      }),
    };
  };
}

/** Recommendations contain evidence only; callers must still obtain human review and authorization. */
export const assessPairs = createReviewer(embedTexts);
