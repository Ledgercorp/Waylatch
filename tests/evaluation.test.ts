import { describe, expect, it } from 'vitest';
import {
  binaryMetrics,
  pairedGroupBootstrap,
  validateEvaluationInputs,
  type EvaluationCase,
  type ScoredCase,
} from '../src/risk/evaluation';

const sample = (id: string, family: string, split: 'calibration' | 'heldout'): EvaluationCase => ({
  id,
  groupId: family,
  supplyFamily: family,
  category: 'manual',
  split,
  scenario: 'Synthetic manual test',
  left: {
    id: `${id}-a`,
    incident: null,
    description: 'water',
    amountCents: null,
    receiptDigest: null,
    transactionReference: null,
    createdAt: '2026-10-13T00:00:00Z',
  },
  right: {
    id: `${id}-b`,
    incident: null,
    description: 'water',
    amountCents: null,
    receiptDigest: null,
    transactionReference: null,
    createdAt: '2026-10-13T00:00:00Z',
  },
});
const scored = (
  id: string,
  family: string,
  truth: boolean,
  a: boolean,
  b: boolean,
): ScoredCase => ({
  caseId: id,
  supplyFamily: family,
  category: 'manual',
  duplicate: truth,
  predictions: { deterministic: a, semantic: a, combined: b },
});

describe('evaluation statistics', () => {
  it('matches a hand counted confusion table and excludes ambiguous annotations', () => {
    const result = binaryMetrics([
      { duplicate: true, predicted: true },
      { duplicate: true, predicted: false },
      { duplicate: false, predicted: true },
      { duplicate: false, predicted: false },
      { duplicate: null, predicted: true },
    ]);
    expect(result).toMatchObject({
      truePositives: 1,
      falsePositives: 1,
      falseNegatives: 1,
      trueNegatives: 1,
      evaluated: 4,
      ambiguousExcluded: 1,
      precision: 0.5,
      recall: 0.5,
      f1: 0.5,
    });
    expect(result.precision95?.[0]).toBeCloseTo(0.0945312, 6);
    expect(result.precision95?.[1]).toBeCloseTo(0.9054688, 6);
    expect(result.recall95).toEqual(result.precision95);
  });
  it('reports undefined ratios as null rather than a manufactured zero', () => {
    expect(binaryMetrics([])).toMatchObject({
      precision: null,
      recall: null,
      f1: null,
      precision95: null,
      recall95: null,
    });
    expect(binaryMetrics([{ duplicate: false, predicted: false }])).toMatchObject({
      precision: null,
      recall: null,
      f1: null,
    });
    expect(binaryMetrics([{ duplicate: true, predicted: false }])).toMatchObject({
      precision: null,
      recall: 0,
      f1: 0,
    });
  });
  it('resamples whole paired supply families with a reproducible seed', () => {
    const rows = [
      scored('a', 'water', true, false, true),
      scored('b', 'water', false, false, false),
      scored('c', 'fuel', true, true, true),
      scored('d', 'fuel', false, true, false),
    ];
    const one = pairedGroupBootstrap(rows, 'deterministic', 'combined', {
      seed: 123,
      iterations: 500,
    });
    const two = pairedGroupBootstrap(rows, 'deterministic', 'combined', {
      seed: 123,
      iterations: 500,
    });
    expect(one).toEqual(two);
    expect(one).toMatchObject({
      groupCount: 2,
      resamplingUnit: 'supplyFamily',
      iterations: 500,
      deltaF1: 0.5,
      validIterations: 500,
    });
    expect(one.deltaF195?.[0]).toBeCloseTo(1 / 3);
    expect(one.deltaF195?.[1]).toBe(1);
  });
  it('reports unestimable bootstrap samples explicitly', () => {
    const result = pairedGroupBootstrap(
      [scored('a', 'water', false, false, false)],
      'deterministic',
      'combined',
      { seed: 1, iterations: 30 },
    );
    expect(result).toMatchObject({
      deltaF1: null,
      deltaF195: null,
      validIterations: 0,
      undefinedIterations: 30,
    });
  });
});

describe('evaluation leakage guards', () => {
  const inputs = (cases: EvaluationCase[]) => ({
    dataset: {
      schemaVersion: 1,
      datasetId: 'test',
      provenance: 'synthetic',
      splitPolicy: 'grouped',
      cases,
    },
    annotations: {
      schemaVersion: 1,
      datasetId: 'test',
      method: 'independent model-blind review',
      annotations: cases.map((item) => ({
        caseId: item.id,
        decision: 'duplicate' as const,
        rationale: 'same event',
        confidence: 'high',
      })),
    },
  });
  it('accepts complete labels with disjoint grouped splits', () => {
    const input = inputs([sample('a', 'water', 'calibration'), sample('b', 'fuel', 'heldout')]);
    expect(validateEvaluationInputs(input.dataset, input.annotations).cases).toHaveLength(2);
  });
  it('rejects supply-family leakage even when group IDs differ', () => {
    const cases = [
      sample('a', 'water', 'calibration'),
      { ...sample('b', 'water', 'heldout'), groupId: 'different' },
    ];
    const input = inputs(cases);
    expect(() => validateEvaluationInputs(input.dataset, input.annotations)).toThrow(
      'supplyFamily crosses splits',
    );
  });
  it('rejects group leakage even when family differs', () => {
    const cases = [
      sample('a', 'water', 'calibration'),
      { ...sample('b', 'fuel', 'heldout'), groupId: 'water' },
    ];
    const input = inputs(cases);
    expect(() => validateEvaluationInputs(input.dataset, input.annotations)).toThrow(
      'groupId crosses splits',
    );
  });
  it('rejects missing, extra, duplicate, and incompatible annotations', () => {
    const { dataset, annotations } = inputs([
      sample('a', 'water', 'calibration'),
      sample('b', 'fuel', 'heldout'),
    ]);
    expect(() =>
      validateEvaluationInputs(dataset, {
        ...annotations,
        annotations: annotations.annotations.slice(1),
      }),
    ).toThrow('Missing annotation');
    expect(() =>
      validateEvaluationInputs(dataset, {
        ...annotations,
        annotations: [
          ...annotations.annotations,
          { ...annotations.annotations[0], caseId: 'unknown' },
        ],
      }),
    ).toThrow('Unknown annotation');
    expect(() =>
      validateEvaluationInputs(dataset, {
        ...annotations,
        annotations: [...annotations.annotations, annotations.annotations[0]],
      }),
    ).toThrow('Duplicate annotation');
    expect(() => validateEvaluationInputs(dataset, { ...annotations, datasetId: 'other' })).toThrow(
      'Dataset identity',
    );
  });
});
