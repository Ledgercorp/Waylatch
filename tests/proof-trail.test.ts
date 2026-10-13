import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { demoRequest, type ResourceRequest } from '../src/requests/schema';
import { validateChain, type AuditEvent } from '../src/audit/chain';
import {
  buildProofTrail,
  exportOriginalChain,
  exportSanitizedReport,
  type ArchivedProviderEvidence,
} from '../src/proof/trail';

const archive = JSON.parse(readFileSync('docs/evidence/paypal-sandbox-audit.json', 'utf8'));
const verification = JSON.parse(
  readFileSync('docs/evidence/paypal-independent-verification.json', 'utf8'),
);
const record: ResourceRequest = archive.events[0].data.record;
const provider: ArchivedProviderEvidence = {
  ...verification,
  sourceFile: 'docs/evidence/paypal-real-sandbox.json',
  sourceSha256: verification.savedEvidenceSha256,
  verificationFile: 'docs/evidence/paypal-independent-verification.json',
};
const historical = {
  record,
  events: archive.events,
  chain: archive.chain,
  providerEvidence: provider,
};

describe('honest request timeline', () => {
  test('does not invent local preservation, QR, AI or approvals from a request alone', () => {
    const trail = buildProofTrail({ record: demoRequest, events: [] });
    expect(trail.entries.map((event) => event.kind)).toEqual(['request-metadata']);
    expect(trail.gaps.join(' ')).toMatch(/local preservation/i);
    expect(trail.gaps.join(' ')).toMatch(/QR/i);
    expect(trail.gaps.join(' ')).toMatch(/AI/i);
    expect(trail.gaps.join(' ')).toMatch(/human review/i);
    expect(trail.chain.status).toBe('not-checked');
  });

  test('local provenance establishes preservation or QR import, never offline execution', () => {
    const trail = buildProofTrail({
      record: demoRequest,
      events: [],
      provenance: {
        request: demoRequest,
        syncStatus: 'pending',
        provenance: {
          source: 'qr-import',
          recordedAt: '2026-10-13T09:00:00.000Z',
          origin: 'private field origin',
          untrusted: true,
        },
      },
    });
    expect(trail.entries[1]).toMatchObject({ kind: 'qr-import', source: 'browser-local' });
    expect(trail.entries[1].summary).toMatch(/untrusted/i);
    expect(trail.entries.some((entry) => /offline/.test(entry.title))).toBe(false);
  });

  test('historical USD 1 payment retains exact identifiers and independent source attribution', () => {
    const trail = buildProofTrail(historical);
    expect(trail.transaction).toMatchObject({
      amountCents: 100,
      currency: 'USD',
      orderId: '2W330508JA572391V',
      captureId: '8WY07860808872629',
      environment: 'sandbox',
    });
    expect(trail.entries.map((entry) => entry.kind)).toContain('coordinator-submission');
    expect(trail.entries.map((entry) => entry.kind)).toContain('human-review');
    expect(trail.entries.map((entry) => entry.kind)).toContain('human-approval');
    expect(trail.entries.map((entry) => entry.kind)).toContain('buyer-approval');
    expect(trail.entries.filter((entry) => entry.kind === 'capture-reconciliation')).toHaveLength(
      1,
    );
    expect(trail.entries.find((entry) => entry.kind === 'capture-reconciliation')?.summary).toMatch(
      /same recorded event/i,
    );
    expect(trail.entries.find((entry) => entry.kind === 'provider-verification')).toMatchObject({
      source: 'archived-provider',
      reference: { file: 'docs/evidence/paypal-independent-verification.json' },
    });
    expect(trail.gaps.join(' ')).toMatch(/AI/i);
    expect(trail.limitations.join(' ')).toMatch(/historical/i);
    expect(trail.entries.map((entry) => entry.at)).toEqual(
      trail.entries.map((entry) => entry.at).sort(),
    );
  });

  test('does not attach unrelated provider evidence or browser provenance', () => {
    const trail = buildProofTrail({
      record: demoRequest,
      events: archive.events,
      providerEvidence: provider,
      provenance: {
        request: record,
        syncStatus: 'pending',
        provenance: {
          source: 'local',
          recordedAt: record.createdAt,
          origin: 'x',
          untrusted: false,
        },
      },
    });
    expect(trail.entries).toHaveLength(1);
    expect(trail.transaction).toBeUndefined();
    expect(trail.gaps.join(' ')).toMatch(/different request/i);
  });

  test('deterministic-only risk evidence does not claim that AI ran', () => {
    const event: AuditEvent = {
      ...archive.events[0],
      type: 'risk_assessment_produced',
      data: { mode: 'deterministic-only', model: null, candidates: [] },
    };
    const trail = buildProofTrail({ record, events: [event] });
    expect(trail.entries.find((entry) => entry.kind === 'risk-assessment')?.title).toMatch(
      /Deterministic/,
    );
    expect(trail.gaps.join(' ')).toMatch(/No semantic AI inference/i);
  });

  test('a recorded claim submission establishes coordinator receipt', () => {
    const event: AuditEvent = { ...archive.events[0], type: 'claim_submitted' };
    const trail = buildProofTrail({ record: { ...record, kind: 'claim' }, events: [event] });
    expect(trail.entries.find((entry) => entry.kind === 'coordinator-submission')).toBeDefined();
    expect(trail.gaps.join(' ')).not.toMatch(/No coordinator submission/);
  });

  test('an evidence-file hash is never attributed to a different verification file', () => {
    const trail = buildProofTrail(historical);
    expect(
      trail.entries.find((entry) => entry.kind === 'provider-verification')?.reference,
    ).not.toHaveProperty('fileSha256', verification.savedEvidenceSha256);
  });
});

describe('distinct report and original chain exports', () => {
  test('an exported historical original chain still independently validates', () => {
    const original = exportOriginalChain(historical);
    const roundTrip = JSON.parse(JSON.stringify(original));
    expect(validateChain(roundTrip.events)).toEqual(archive.chain);
  });
  test('sanitized reports omit notes, credentials, payer data and operation keys', () => {
    const events: AuditEvent[] = structuredClone(archive.events);
    for (const event of events) {
      Object.assign(event.data as object, {
        note: 'SECRET_REVIEW',
        password: 'SECRET_PASSWORD',
        accessToken: 'SECRET_TOKEN',
        payer: { email: 'SECRET_PAYER' },
        createKey: 'SECRET_CREATE',
        captureKey: 'SECRET_CAPTURE',
      });
    }
    const report = exportSanitizedReport(buildProofTrail({ ...historical, events }));
    const json = JSON.stringify(report);
    expect(json).not.toMatch(/SECRET_|Human operator explicitly replied/);
    expect(report.format).toBe('waylatch-proof-report-v1');
    expect(report.hashScope).toMatch(/not original event preimages/i);
    expect(report).not.toHaveProperty('events');
  });

  test('original chain export preserves complete organizational events even across requests', () => {
    const events: AuditEvent[] = structuredClone(archive.events);
    events[1].recordId = 'ANOTHER_RECORD';
    const exported = exportOriginalChain({ record, events, chain: archive.chain });
    expect(exported.events).toEqual(events);
    expect(exported.events.map((event) => event.hash)).toEqual(events.map((event) => event.hash));
    expect(exported.scope).toBe('organization-chain');
    expect(exported.requestTimelineRecordId).toBe(record.id);
    expect(exported.limitations.join(' ')).toMatch(/filtering.*break/i);
  });

  test('a filtered suffix is explicitly incomplete despite supplied valid metadata', () => {
    const exported = exportOriginalChain({ ...historical, events: archive.events.slice(4) });
    expect(exported.completeFromGenesis).toBe(false);
    expect(exported.limitations.join(' ')).toMatch(/incomplete/i);
    expect(buildProofTrail({ ...historical, events: archive.events.slice(4) }).chain.status).toBe(
      'scope-mismatch',
    );
  });
});
