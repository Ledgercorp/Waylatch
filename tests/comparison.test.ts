import { describe, expect, test } from 'vitest';
import {
  compareDescriptions,
  compareRequestEvidence,
  latestPairDisposition,
} from '../src/risk/comparison';
import { demoRequest } from '../src/requests/schema';
import type { AuditEvent } from '../src/audit/chain';

describe('review comparison evidence', () => {
  test('highlights meaningful shared Unicode terms while preserving every source character', () => {
    const comparison = compareDescriptions(
      'Water for café — radios <img onerror="evil()">',
      'CAFÉ water and medical kits',
    );
    expect(comparison.sharedTerms).toEqual(['water', 'café']);
    expect(comparison.left.map((part) => part.text).join('')).toBe(
      'Water for café — radios <img onerror="evil()">',
    );
    expect(comparison.left.find((part) => part.text === 'for')?.kind).toBe('plain');
    expect(comparison.left.find((part) => part.text === 'radios')?.kind).toBe('different');
    expect(comparison.right.find((part) => part.text === 'CAFÉ')?.kind).toBe('shared');
  });

  test('recognizes canonically equivalent Unicode terms without dropping combining characters', () => {
    const text = 'Cafe\u0301 water';
    const comparison = compareDescriptions(text, 'CAFÉ water');
    expect(comparison.sharedTerms).toEqual(['café', 'water']);
    expect(comparison.left.map((part) => part.text).join('')).toBe(text);
    expect(comparison.left[0]).toEqual({ text: 'Cafe\u0301', kind: 'shared' });
  });

  test('missing evidence never becomes a match and known contradictory context stays visible', () => {
    const other = {
      ...demoRequest,
      id: 'OTHER01',
      incident: 'OTHER INCIDENT',
      amountCents: 25000,
      createdAt: '2026-10-20T08:00:00.000Z',
    };
    const facts = compareRequestEvidence(demoRequest, other);
    expect(facts.find((fact) => fact.label === 'Receipt digest')?.state).toBe('missing');
    expect(facts.find((fact) => fact.label === 'Transaction reference')?.state).toBe('missing');
    expect(facts.find((fact) => fact.label === 'Incident')?.state).toBe('different');
    expect(facts.find((fact) => fact.label === 'Amount')?.state).toBe('different');
    expect(facts.find((fact) => fact.label === 'Created time')?.detail).toContain(
      '168 hours apart',
    );
    expect(facts.find((fact) => fact.label === 'Receipt digest')?.detail).toContain('both');
  });

  test('exact receipt evidence survives conflicting incident and amount context', () => {
    const left = { ...demoRequest, receiptDigest: 'a'.repeat(64) };
    const right = {
      ...left,
      id: 'OTHER01',
      incident: 'OTHER INCIDENT',
      amountCents: 25000,
      transactionReference: 'capture-2',
    };
    const facts = compareRequestEvidence(left, right);
    expect(facts.find((fact) => fact.label === 'Receipt digest')?.state).toBe('same');
    expect(facts.find((fact) => fact.label === 'Incident')?.state).toBe('different');
    expect(facts.find((fact) => fact.label === 'Transaction reference')?.state).toBe('missing');
  });

  test('returns the latest durable paired note in either direction and identifies old revisions', () => {
    const right = { ...demoRequest, id: 'OTHER01', revision: 2 };
    const event = (seq: number, recordId: string, data: unknown): AuditEvent => ({
      seq,
      recordId,
      data,
      type: 'pair_disposition_recorded',
      at: '2026-10-13T09:00:00.000Z',
      hash: 'x',
      previous: 'x',
    });
    const events = [
      event(1, demoRequest.id, {
        candidateId: right.id,
        revision: 1,
        candidateRevision: 1,
        disposition: 'related',
        note: 'Old revision',
      }),
      event(3, right.id, {
        candidateId: demoRequest.id,
        revision: 2,
        candidateRevision: 1,
        disposition: 'unrelated',
        note: 'Separate delivery',
      }),
      event(9, 'DIFFERENT', {
        candidateId: demoRequest.id,
        revision: 1,
        candidateRevision: 1,
        disposition: 'related',
        note: 'Wrong pair',
      }),
      event(10, right.id, { candidateId: demoRequest.id, disposition: 'related' }),
    ];
    expect(latestPairDisposition(events, demoRequest, right)).toMatchObject({
      seq: 3,
      disposition: 'unrelated',
      note: 'Separate delivery',
      currentRevisions: true,
    });
    expect(
      latestPairDisposition(events, { ...demoRequest, revision: 2 }, right)?.currentRevisions,
    ).toBe(false);
  });
});
