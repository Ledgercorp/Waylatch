import type { ReviewRecord } from './review';

export type Method = 'deterministic' | 'semantic' | 'combined';
export const METHODS: Method[] = ['deterministic', 'semantic', 'combined'];
export interface EvaluationCase {
  id: string;
  groupId: string;
  supplyFamily: string;
  category: string;
  split: 'calibration' | 'heldout';
  scenario: string;
  left: ReviewRecord;
  right: ReviewRecord;
}
export interface Annotation {
  caseId: string;
  decision: 'duplicate' | 'distinct' | 'ambiguous';
  rationale: string;
  confidence: unknown;
}
export interface EvaluationDataset {
  schemaVersion: number;
  datasetId: string;
  provenance: unknown;
  splitPolicy: unknown;
  cases: EvaluationCase[];
}
export interface EvaluationAnnotations {
  schemaVersion: number;
  datasetId: string;
  method: unknown;
  annotations: Annotation[];
}
export interface BinaryRow {
  duplicate: boolean | null;
  predicted: boolean;
}
export interface ScoredCase {
  caseId: string;
  supplyFamily: string;
  category: string;
  duplicate: boolean | null;
  predictions: Record<Method, boolean>;
}

/** Wilson intervals describe binomial case counts; they do not adjust for within-family dependence. */
export function wilson95(successes: number, total: number): [number, number] | null {
  if (
    !Number.isSafeInteger(total) ||
    !Number.isSafeInteger(successes) ||
    successes < 0 ||
    total < successes
  )
    throw new Error('Invalid binomial counts');
  if (!total) return null;
  const z = 1.959963984540054;
  const p = successes / total;
  const scale = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / scale;
  const half = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / scale;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

export function binaryMetrics(rows: BinaryRow[]) {
  let truePositives = 0,
    falsePositives = 0,
    falseNegatives = 0,
    trueNegatives = 0,
    ambiguousExcluded = 0;
  for (const row of rows) {
    if (row.duplicate === null) ambiguousExcluded++;
    else if (row.duplicate && row.predicted) truePositives++;
    else if (row.duplicate) falseNegatives++;
    else if (row.predicted) falsePositives++;
    else trueNegatives++;
  }
  const precisionDenominator = truePositives + falsePositives;
  const recallDenominator = truePositives + falseNegatives;
  const f1Denominator = 2 * truePositives + falsePositives + falseNegatives;
  return {
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    ambiguousExcluded,
    evaluated: truePositives + falsePositives + falseNegatives + trueNegatives,
    precision: precisionDenominator ? truePositives / precisionDenominator : null,
    recall: recallDenominator ? truePositives / recallDenominator : null,
    f1: f1Denominator ? (2 * truePositives) / f1Denominator : null,
    precision95: wilson95(truePositives, precisionDenominator),
    recall95: wilson95(truePositives, recallDenominator),
  };
}

function quantile(sorted: number[], probability: number): number {
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
}
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paired percentile bootstrap: sample families with replacement and retain every case in each draw. */
export function pairedGroupBootstrap(
  rows: ScoredCase[],
  baseline: Method,
  comparison: Method,
  options = { seed: 20261013, iterations: 10000 },
) {
  if (
    !Number.isSafeInteger(options.seed) ||
    !Number.isSafeInteger(options.iterations) ||
    options.iterations < 1
  )
    throw new Error('Invalid bootstrap settings');
  const grouped = new Map<string, ScoredCase[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.supplyFamily) ?? [];
    bucket.push(row);
    grouped.set(row.supplyFamily, bucket);
  }
  const groups = [...grouped.keys()].sort().map((key) => grouped.get(key)!);
  const f1 = (sample: ScoredCase[], method: Method) =>
    binaryMetrics(
      sample.map((row) => ({ duplicate: row.duplicate, predicted: row.predictions[method] })),
    ).f1;
  const baselineF1 = f1(rows, baseline),
    comparisonF1 = f1(rows, comparison);
  const random = seededRandom(options.seed);
  const deltas: number[] = [],
    baselineSamples: number[] = [],
    comparisonSamples: number[] = [];
  for (let i = 0; i < options.iterations; i++) {
    const sample: ScoredCase[] = [];
    for (let draw = 0; draw < groups.length; draw++)
      sample.push(...groups[Math.floor(random() * groups.length)]);
    const a = f1(sample, baseline),
      b = f1(sample, comparison);
    if (a !== null) baselineSamples.push(a);
    if (b !== null) comparisonSamples.push(b);
    if (a !== null && b !== null) deltas.push(b - a);
  }
  const interval = (values: number[]): [number, number] | null => {
    if (!values.length) return null;
    values.sort((a, b) => a - b);
    return [quantile(values, 0.025), quantile(values, 0.975)];
  };
  return {
    baseline,
    comparison,
    baselineF1,
    comparisonF1,
    deltaF1: baselineF1 === null || comparisonF1 === null ? null : comparisonF1 - baselineF1,
    deltaF195: interval(deltas),
    baselineF195: interval(baselineSamples),
    comparisonF195: interval(comparisonSamples),
    seed: options.seed,
    iterations: options.iterations,
    validIterations: deltas.length,
    undefinedIterations: options.iterations - deltas.length,
    groupCount: groups.length,
    resamplingUnit: 'supplyFamily' as const,
    warning:
      groups.length < 10
        ? 'Few independent families: bootstrap intervals are exploratory and may be unstable.'
        : null,
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function nonempty(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim();
}
function validateRecord(value: unknown): void {
  if (
    !object(value) ||
    !nonempty(value.id) ||
    !nonempty(value.description) ||
    value.description.length > 2000 ||
    !nonempty(value.createdAt) ||
    !Number.isFinite(Date.parse(value.createdAt))
  )
    throw new Error('Invalid review record');
  for (const field of ['incident', 'receiptDigest', 'transactionReference'])
    if (!(value[field] === null || typeof value[field] === 'string'))
      throw new Error(`Invalid record ${field}`);
  if (!(value.amountCents === null || Number.isSafeInteger(value.amountCents)))
    throw new Error('Invalid record amountCents');
}

export function validateEvaluationInputs(
  datasetValue: unknown,
  annotationsValue: unknown,
): EvaluationDataset & { labels: Map<string, Annotation> } {
  if (
    !object(datasetValue) ||
    !object(annotationsValue) ||
    datasetValue.schemaVersion !== 1 ||
    annotationsValue.schemaVersion !== 1 ||
    !nonempty(datasetValue.datasetId) ||
    datasetValue.datasetId !== annotationsValue.datasetId
  )
    throw new Error('Dataset identity or schema mismatch');
  if (
    !Array.isArray(datasetValue.cases) ||
    !datasetValue.cases.length ||
    !Array.isArray(annotationsValue.annotations)
  )
    throw new Error('Cases and annotations required');
  if (!datasetValue.provenance || !datasetValue.splitPolicy || !annotationsValue.method)
    throw new Error('Provenance, split policy and annotation method required');
  const ids = new Set<string>();
  const groups = new Map<string, string>(),
    families = new Map<string, string>();
  for (const item of datasetValue.cases) {
    if (
      !object(item) ||
      !['id', 'groupId', 'supplyFamily', 'category', 'scenario'].every((key) =>
        nonempty(item[key]),
      ) ||
      !['calibration', 'heldout'].includes(String(item.split))
    )
      throw new Error('Invalid evaluation case');
    if (ids.has(item.id as string)) throw new Error(`Duplicate case ${item.id}`);
    ids.add(item.id as string);
    for (const [field, map] of [
      ['groupId', groups],
      ['supplyFamily', families],
    ] as const) {
      const key = item[field] as string;
      if (map.has(key) && map.get(key) !== item.split)
        throw new Error(`${field} crosses splits: ${key}`);
      map.set(key, item.split as string);
    }
    validateRecord(item.left);
    validateRecord(item.right);
    if ((item.left as ReviewRecord).id === (item.right as ReviewRecord).id)
      throw new Error('Pair record IDs must differ');
    if ('duplicate' in item || 'decision' in item || 'label' in item)
      throw new Error('Unlabeled dataset must not carry target labels');
  }
  const labels = new Map<string, Annotation>();
  for (const item of annotationsValue.annotations) {
    if (
      !object(item) ||
      !nonempty(item.caseId) ||
      !['duplicate', 'distinct', 'ambiguous'].includes(String(item.decision)) ||
      !nonempty(item.rationale) ||
      item.confidence === undefined
    )
      throw new Error('Invalid annotation');
    if (!ids.has(item.caseId)) throw new Error(`Unknown annotation ${item.caseId}`);
    if (labels.has(item.caseId)) throw new Error(`Duplicate annotation ${item.caseId}`);
    labels.set(item.caseId, item as unknown as Annotation);
  }
  for (const id of ids) if (!labels.has(id)) throw new Error(`Missing annotation ${id}`);
  return { ...(datasetValue as unknown as EvaluationDataset), labels };
}
