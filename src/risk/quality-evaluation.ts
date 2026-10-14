import { binaryMetrics, pairedGroupBootstrap, type ScoredCase } from './evaluation';
import type { QualityRecord } from './review-quality';

export const QUALITY_TIERS = [
  'none',
  'potentially-related',
  'needs-verification',
  'strong-duplicate-evidence',
] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];
export type QualityMethod = 'v1Combined' | 'revisedAttention' | 'revisedStrong';
export interface QualityCase {
  id: string;
  groupId: string;
  supplyFamily: string;
  category: string;
  split: 'calibration' | 'heldout';
  scenario: string;
  left: QualityRecord;
  right: QualityRecord;
}
export interface QualityAnnotation {
  caseId: string;
  decision: 'duplicate' | 'distinct' | 'ambiguous';
  evidenceTier: QualityTier | 'ambiguous';
  rationale: string;
  tierRationale: string;
  confidence: string | number;
}
export interface QualityRow {
  caseId: string;
  supplyFamily: string;
  category: string;
  duplicate: boolean | null;
  evidenceTier: QualityTier | 'ambiguous';
  similarity: number;
  v1Recommended: boolean;
  tier: QualityTier;
  priority: number;
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' && !!value.trim() && value.length <= maximum;
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error('Unknown source field or target label');
}
function date(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.length <= 40 &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
  );
}
function record(value: unknown): void {
  if (!object(value)) throw new Error('Invalid review record');
  keys(value, [
    'id',
    'incident',
    'description',
    'amountCents',
    'receiptDigest',
    'transactionReference',
    'createdAt',
    'location',
    'expenseAt',
    'amountKind',
  ]);
  if (
    typeof value.id !== 'string' ||
    !/^[a-zA-Z0-9_-]{6,48}$/.test(value.id) ||
    !text(value.description, 2000) ||
    !date(value.createdAt)
  )
    throw new Error('Invalid record id, description or createdAt');
  for (const key of ['incident', 'location']) {
    if (key === 'location' && !(key in value)) continue;
    if (value[key] !== null && !text(value[key], 160)) throw new Error(`Invalid record ${key}`);
  }
  if (!(
    value.amountCents === null ||
    (Number.isSafeInteger(value.amountCents) &&
      Number(value.amountCents) >= 1 &&
      Number(value.amountCents) <= 10000000)
  ))
    throw new Error('Invalid record amountCents');
  if (!(
    value.receiptDigest === null ||
    (typeof value.receiptDigest === 'string' && /^[a-f0-9]{64}$/.test(value.receiptDigest))
  ))
    throw new Error('Invalid record receiptDigest');
  if (!(value.transactionReference === null || text(value.transactionReference, 100)))
    throw new Error('Invalid record transactionReference');
  if ('expenseAt' in value && !(value.expenseAt === null || date(value.expenseAt)))
    throw new Error('Invalid record expenseAt');
  if (
    'amountKind' in value &&
    (!['exact', 'estimate', 'unknown'].includes(String(value.amountKind)) ||
      (value.amountCents === null) !== (value.amountKind === 'unknown'))
  )
    throw new Error('Invalid record amountKind');
}
export function validateQualityInputs(dataset: unknown, annotations: unknown) {
  if (
    !object(dataset) ||
    !object(annotations) ||
    dataset.schemaVersion !== 2 ||
    annotations.schemaVersion !== 2 ||
    !text(dataset.datasetId, 200) ||
    dataset.datasetId !== annotations.datasetId
  )
    throw new Error('Dataset identity or schema mismatch');
  keys(dataset, ['schemaVersion', 'datasetId', 'provenance', 'splitPolicy', 'cases']);
  keys(annotations, ['schemaVersion', 'datasetId', 'method', 'annotations']);
  if (!dataset.provenance || !dataset.splitPolicy || !annotations.method)
    throw new Error('Provenance, split policy and annotation method required');
  if (
    !Array.isArray(dataset.cases) ||
    !dataset.cases.length ||
    dataset.cases.length > 10000 ||
    !Array.isArray(annotations.annotations)
  )
    throw new Error('Bounded cases and annotations required');
  const ids = new Set<string>(),
    pairs = new Set<string>(),
    recordIds = new Set<string>();
  const groups = new Map<string, string>(),
    families = new Map<string, string>();
  for (const item of dataset.cases) {
    if (!object(item)) throw new Error('Invalid evaluation case');
    keys(item, ['id', 'groupId', 'supplyFamily', 'category', 'split', 'scenario', 'left', 'right']);
    if (
      !['id', 'groupId', 'supplyFamily', 'category'].every((key) => text(item[key], 160)) ||
      !text(item.scenario, 10000) ||
      !['calibration', 'heldout'].includes(String(item.split))
    )
      throw new Error('Invalid evaluation case');
    if (ids.has(item.id as string)) throw new Error('Duplicate case ID');
    ids.add(item.id as string);
    for (const [key, mapping] of [
      ['groupId', groups],
      ['supplyFamily', families],
    ] as const) {
      const id = item[key] as string;
      if (mapping.has(id) && mapping.get(id) !== item.split)
        throw new Error(`${key} crosses splits`);
      mapping.set(id, item.split as string);
    }
    record(item.left);
    record(item.right);
    const left = item.left as QualityRecord,
      right = item.right as QualityRecord;
    if (left.id === right.id) throw new Error('Pair record IDs must differ');
    const pair = JSON.stringify([left.id, right.id].sort());
    if (pairs.has(pair)) throw new Error('Duplicate unordered pair IDs');
    pairs.add(pair);
    for (const id of [left.id, right.id]) {
      if (recordIds.has(id))
        throw new Error('Record IDs must be unique across this independent-pair corpus');
      recordIds.add(id);
    }
  }
  const labels = new Map<string, QualityAnnotation>();
  for (const item of annotations.annotations) {
    if (!object(item)) throw new Error('Invalid annotation');
    keys(item, ['caseId', 'decision', 'evidenceTier', 'rationale', 'tierRationale', 'confidence']);
    if (
      !text(item.caseId, 160) ||
      !['duplicate', 'distinct', 'ambiguous'].includes(String(item.decision)) ||
      ![...QUALITY_TIERS, 'ambiguous'].includes(String(item.evidenceTier)) ||
      !text(item.rationale, 20000) ||
      !text(item.tierRationale, 20000) ||
      !(
        text(item.confidence, 200) ||
        (typeof item.confidence === 'number' &&
          Number.isFinite(item.confidence) &&
          item.confidence >= 0 &&
          item.confidence <= 1)
      )
    )
      throw new Error('Invalid annotation');
    if (!ids.has(item.caseId)) throw new Error(`Unknown annotation ${item.caseId}`);
    if (labels.has(item.caseId)) throw new Error(`Duplicate annotation ${item.caseId}`);
    labels.set(item.caseId, item as unknown as QualityAnnotation);
  }
  for (const id of ids) if (!labels.has(id)) throw new Error(`Missing annotation ${id}`);
  return {
    datasetId: dataset.datasetId,
    provenance: dataset.provenance,
    splitPolicy: dataset.splitPolicy,
    method: annotations.method,
    cases: dataset.cases as QualityCase[],
    labels,
  };
}
export function predicted(row: QualityRow, method: QualityMethod): boolean {
  return method === 'v1Combined'
    ? row.v1Recommended
    : method === 'revisedStrong'
      ? row.tier === 'strong-duplicate-evidence'
      : row.tier === 'needs-verification' || row.tier === 'strong-duplicate-evidence';
}
export function qualityBinaryMetrics(rows: QualityRow[], method: QualityMethod) {
  const counts = binaryMetrics(
    rows.map((row) => ({ duplicate: row.duplicate, predicted: predicted(row, method) })),
  );
  const distinct = counts.falsePositives + counts.trueNegatives;
  return {
    ...counts,
    falsePositiveRate: distinct ? counts.falsePositives / distinct : null,
    alertsPer100Distinct: distinct ? (100 * counts.falsePositives) / distinct : null,
    totalAlerts: rows.filter((row) => predicted(row, method)).length,
  };
}
export function budgetMetrics(rows: QualityRow[], method: 'v1Combined' | 'revisedAttention') {
  const eligible = rows.filter((row) => row.duplicate !== null);
  eligible.sort((a, b) => {
    const priority =
      method === 'v1Combined'
        ? Number(b.v1Recommended) - Number(a.v1Recommended)
        : QUALITY_TIERS.indexOf(b.tier) - QUALITY_TIERS.indexOf(a.tier) || b.priority - a.priority;
    return (
      priority ||
      b.similarity - a.similarity ||
      (a.caseId < b.caseId ? -1 : a.caseId > b.caseId ? 1 : 0)
    );
  });
  const budget = Math.floor(0.2 * eligible.length),
    selected = eligible.slice(0, budget);
  const duplicates = eligible.filter((row) => row.duplicate).length,
    retrieved = selected.filter((row) => row.duplicate).length;
  return {
    fraction: 0.2,
    eligiblePairs: eligible.length,
    inspectedPairs: budget,
    duplicatesRetrieved: retrieved,
    distinctInspected: budget - retrieved,
    duplicateRecall: duplicates ? retrieved / duplicates : null,
    precision: budget ? retrieved / budget : null,
    selectedCaseIds: selected.map((row) => row.caseId),
  };
}
export function tierMetrics(rows: QualityRow[]) {
  const counts = Object.fromEntries(QUALITY_TIERS.map((tier) => [tier, 0])) as Record<
    QualityTier,
    number
  >;
  const confusion = Object.fromEntries(
    QUALITY_TIERS.map((tier) => [
      tier,
      Object.fromEntries(QUALITY_TIERS.map((predicted) => [predicted, 0])),
    ]),
  ) as Record<QualityTier, Record<QualityTier, number>>;
  let evaluated = 0,
    correct = 0,
    ambiguousExcluded = 0;
  for (const row of rows) {
    counts[row.tier]++;
    if (row.evidenceTier === 'ambiguous') ambiguousExcluded++;
    else {
      evaluated++;
      confusion[row.evidenceTier][row.tier]++;
      if (row.evidenceTier === row.tier) correct++;
    }
  }
  return {
    counts,
    confusion,
    confusionRows: 'records-only annotated tier',
    confusionColumns: 'predicted tier',
    evaluated,
    correct,
    ambiguousExcluded,
    accuracy: evaluated ? correct / evaluated : null,
  };
}
export function summarizeQuality(rows: QualityRow[]) {
  const methods = {
    v1Combined: qualityBinaryMetrics(rows, 'v1Combined'),
    revisedAttention: qualityBinaryMetrics(rows, 'revisedAttention'),
    revisedStrong: qualityBinaryMetrics(rows, 'revisedStrong'),
  };
  return {
    methods,
    budget: {
      v1Combined: budgetMetrics(rows, 'v1Combined'),
      revisedAttention: budgetMetrics(rows, 'revisedAttention'),
    },
    tiers: tierMetrics(rows),
    relationships: {
      candidatePairs: rows.length,
      v1ReturnedCandidates: rows.length,
      v1AttentionRelationships: methods.v1Combined.totalAlerts,
      revisedReturnedCandidates: rows.length,
      revisedRelatedRelationships: rows.filter((row) => row.tier !== 'none').length,
      definition:
        'Both scorers return every supplied candidate; revised related relationships exclude tier none. Attention and strong alerts are separately counted.',
    },
  };
}
export function qualitySuccess(rows: QualityRow[]) {
  const baseline = qualityBinaryMetrics(rows, 'v1Combined'),
    attention = qualityBinaryMetrics(rows, 'revisedAttention'),
    strong = qualityBinaryMetrics(rows, 'revisedStrong');
  const criteria = {
    atLeast50PercentLowerFPR:
      baseline.falsePositiveRate !== null &&
      baseline.falsePositiveRate > 0 &&
      attention.falsePositiveRate !== null &&
      attention.falsePositiveRate <= baseline.falsePositiveRate * 0.5,
    atMost10AttentionAlertsPer100Distinct:
      attention.alertsPer100Distinct !== null && attention.alertsPer100Distinct <= 10,
    atLeastHalfDuplicateRecall: attention.recall !== null && attention.recall >= 0.5,
  };
  return {
    primaryPass: Object.values(criteria).every(Boolean),
    criteria,
    strongPrecisionTarget: {
      threshold: 0.8,
      precision: strong.precision,
      pass: strong.precision !== null && strong.precision >= 0.8,
    },
    relativeFPRReduction:
      baseline.falsePositiveRate !== null &&
      baseline.falsePositiveRate > 0 &&
      attention.falsePositiveRate !== null
        ? 1 - attention.falsePositiveRate / baseline.falsePositiveRate
        : null,
    scope:
      'Predetermined engineering targets on this synthetic split; not operational prevalence estimates.',
  };
}
export function qualityPairedBootstrap(
  rows: QualityRow[],
  options = { seed: 20261013, iterations: 10000 },
) {
  // Explicit remapping lets the preserved v1 family-bootstrap helper compare the new methods without changing v1 code.
  const remapped: ScoredCase[] = rows.map((row) => ({
    caseId: row.caseId,
    supplyFamily: row.supplyFamily,
    category: row.category,
    duplicate: row.duplicate,
    predictions: {
      deterministic: row.v1Recommended,
      semantic: predicted(row, 'revisedAttention'),
      combined: predicted(row, 'revisedAttention'),
    },
  }));
  const f1 = pairedGroupBootstrap(remapped, 'deterministic', 'combined', options);
  const groups = [...new Set(rows.map((row) => row.supplyFamily))]
    .sort()
    .map((family) => rows.filter((row) => row.supplyFamily === family));
  let state = options.seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const deltas = {
    falsePositiveRate: [] as number[],
    recall: [] as number[],
    budgetedRecall: [] as number[],
  };
  const differences = (sample: QualityRow[]) => {
    const a = qualityBinaryMetrics(sample, 'v1Combined'),
      b = qualityBinaryMetrics(sample, 'revisedAttention');
    const ba = budgetMetrics(sample, 'v1Combined'),
      bb = budgetMetrics(sample, 'revisedAttention');
    return {
      falsePositiveRate:
        a.falsePositiveRate === null || b.falsePositiveRate === null
          ? null
          : b.falsePositiveRate - a.falsePositiveRate,
      recall: a.recall === null || b.recall === null ? null : b.recall - a.recall,
      budgetedRecall:
        ba.duplicateRecall === null || bb.duplicateRecall === null
          ? null
          : bb.duplicateRecall - ba.duplicateRecall,
    };
  };
  for (let i = 0; i < options.iterations; i++) {
    const sample: QualityRow[] = [];
    for (let draw = 0; draw < groups.length; draw++)
      sample.push(...groups[Math.floor(random() * groups.length)]);
    const delta = differences(sample);
    for (const key of Object.keys(deltas) as Array<keyof typeof deltas>)
      if (delta[key] !== null) deltas[key].push(delta[key]!);
  }
  const point = differences(rows);
  const descriptive = Object.fromEntries(
    Object.entries(deltas).map(([key, samples]) => {
      samples.sort((a, b) => a - b);
      const quantile = (p: number) => {
        const pos = (samples.length - 1) * p,
          low = Math.floor(pos);
        return samples[low] + (samples[Math.ceil(pos)] - samples[low]) * (pos - low);
      };
      return [
        key,
        {
          difference: point[key as keyof typeof point],
          interval95: samples.length ? [quantile(0.025), quantile(0.975)] : null,
          validIterations: samples.length,
          undefinedIterations: options.iterations - samples.length,
        },
      ];
    }),
  );
  return {
    ...f1,
    baseline: 'v1Combined',
    comparison: 'revisedAttention',
    methodRemapping: { deterministic: 'v1Combined', combined: 'revisedAttention' },
    descriptive,
    differenceDirection: 'revised minus v1',
    limitations:
      'Paired supply-family bootstrap with few synthetic clusters and shared author templates: exploratory, not independent population evidence.',
  };
}
