import type { AuditEvent } from '../audit/chain';
import type { ResourceRequest } from '../requests/schema';

export type DescriptionPart = { text: string; kind: 'shared' | 'different' | 'plain' };
const commonTerms = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'is',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);
const wordPattern = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:[’'-][\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*/gu;
const normalize = (text: string) => text.normalize('NFKC').toLowerCase();
const meaningful = (text: string) => Array.from(text).length > 1 && !commonTerms.has(text);

/** Exact normalized terms only; this is not semantic attribution or an AI explanation. */
export function compareDescriptions(leftText: string, rightText: string) {
  const terms = (text: string) =>
    Array.from(text.matchAll(wordPattern), (match) => normalize(match[0])).filter(meaningful);
  const leftTerms = new Set(terms(leftText));
  const rightTerms = new Set(terms(rightText));
  const sharedTerms = [...leftTerms].filter((term) => rightTerms.has(term));
  const shared = new Set(sharedTerms);
  const parts = (text: string): DescriptionPart[] => {
    const result: DescriptionPart[] = [];
    let offset = 0;
    for (const match of text.matchAll(wordPattern)) {
      const index = match.index;
      if (index > offset) result.push({ text: text.slice(offset, index), kind: 'plain' });
      const term = normalize(match[0]);
      result.push({
        text: match[0],
        kind: !meaningful(term) ? 'plain' : shared.has(term) ? 'shared' : 'different',
      });
      offset = index + match[0].length;
    }
    if (offset < text.length) result.push({ text: text.slice(offset), kind: 'plain' });
    return result;
  };
  return { left: parts(leftText), right: parts(rightText), sharedTerms };
}

export type EvidenceFact = {
  label: string;
  left: string;
  right: string;
  state: 'same' | 'different' | 'missing';
  detail: string;
};

/** Context is displayed separately from the frozen model recommendation. Missing is never a match. */
export function compareRequestEvidence(
  left: ResourceRequest,
  right: ResourceRequest,
): EvidenceFact[] {
  const fact = (label: string, a: string | null, b: string | null): EvidenceFact => ({
    label,
    left: a ?? 'Unknown',
    right: b ?? 'Unknown',
    state: a === null || b === null ? 'missing' : a === b ? 'same' : 'different',
    detail:
      a === null && b === null
        ? 'Missing evidence in both records; no match established.'
        : a === null || b === null
          ? 'Missing evidence in one record; no match established.'
          : a === b
            ? 'Exact match of recorded values.'
            : 'Recorded values differ; inspect the context.',
  });
  const known = (value: string | null) => (value?.trim() ? value : null);
  const amount = (record: ResourceRequest) =>
    record.amountCents === null
      ? null
      : `${new Intl.NumberFormat('en-US', { style: 'currency', currency: record.currency }).format(record.amountCents / 100)} (${record.amountKind})`;
  const created = fact('Created time', left.createdAt, right.createdAt);
  const elapsed = Math.abs(Date.parse(left.createdAt) - Date.parse(right.createdAt));
  if (Number.isFinite(elapsed))
    created.detail = `${Number((elapsed / 3600000).toFixed(1))} hours apart${elapsed <= 72 * 3600000 ? ' · within 72 hours' : ' · more than 72 hours'}. Timing alone does not establish duplication.`;
  const quantities = (record: ResourceRequest) =>
    record.resources
      .map((resource, index) => `${index + 1}: ${resource.quantity ?? 'Unknown'}`)
      .join('; ');
  const quantity = fact('Quantities by resource row', quantities(left), quantities(right));
  if ([...left.resources, ...right.resources].some((resource) => resource.quantity === null)) {
    quantity.state = 'missing';
    quantity.detail =
      'Some quantities are unknown. Resource row order may differ; compare each description.';
  } else quantity.detail += ' Resource row order may differ; compare each description.';
  return [
    fact('Receipt digest', known(left.receiptDigest), known(right.receiptDigest)),
    fact(
      'Transaction reference',
      known(left.transactionReference),
      known(right.transactionReference),
    ),
    fact('Incident', known(left.incident), known(right.incident)),
    fact('Amount', amount(left), amount(right)),
    quantity,
    created,
    fact('Expense time', known(left.expenseAt), known(right.expenseAt)),
    fact('Location', known(left.location), known(right.location)),
    fact('Origin', known(left.origin), known(right.origin)),
    fact('Record kind', left.kind, right.kind),
  ];
}

export type PairDisposition = 'related' | 'unrelated' | 'investigate';
export type SavedPairDisposition = {
  seq: number;
  at: string;
  disposition: PairDisposition;
  note: string;
  currentRevisions: boolean;
};

/** Reversed pairs refer to the same relationship; old events remain visible with their revision scope. */
export function latestPairDisposition(
  events: AuditEvent[],
  left: ResourceRequest,
  right: ResourceRequest,
): SavedPairDisposition | null {
  let latest: SavedPairDisposition | null = null;
  for (const event of events) {
    if (event.type !== 'pair_disposition_recorded' || !event.data || typeof event.data !== 'object')
      continue;
    const data = event.data as Record<string, unknown>;
    const forward = event.recordId === left.id && data.candidateId === right.id;
    const reverse = event.recordId === right.id && data.candidateId === left.id;
    if (
      (!forward && !reverse) ||
      !['related', 'unrelated', 'investigate'].includes(data.disposition as string) ||
      typeof data.note !== 'string' ||
      !Number.isSafeInteger(data.revision) ||
      !Number.isSafeInteger(data.candidateRevision)
    )
      continue;
    if (latest && event.seq <= latest.seq) continue;
    latest = {
      seq: event.seq,
      at: event.at,
      disposition: data.disposition as PairDisposition,
      note: data.note,
      currentRevisions:
        data.revision === (forward ? left.revision : right.revision) &&
        data.candidateRevision === (forward ? right.revision : left.revision),
    };
  }
  return latest;
}
