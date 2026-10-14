import 'fake-indexeddb/auto';
import { afterEach, expect, test, vi } from 'vitest';
import { saveRequest } from '../src/offline/storage';
import { demoRequest } from '../src/requests/schema';
import { buildProofTrail } from '../src/proof/trail';
afterEach(() => vi.unstubAllGlobals());
test('browser offline observation is recorded as local evidence without cryptographic proof', async () => {
  vi.stubGlobal('navigator', { onLine: false });
  const record = { ...demoRequest, id: 'RL-OFFLINE-OBSERVED' };
  const entry = await saveRequest(record);
  expect(entry.provenance.connectivity).toBe('offline');
  const proof = buildProofTrail({ record, provenance: entry, events: [] });
  expect(proof.entries.find((e) => e.kind === 'local-preservation')?.summary).toContain(
    'reported offline',
  );
  expect(proof.entries.find((e) => e.kind === 'local-preservation')?.summary).toContain(
    'not cryptographic',
  );
});
test('legacy local provenance still does not claim offline action', () => {
  const proof = buildProofTrail({
    record: demoRequest,
    events: [],
    provenance: {
      source: 'local',
      recordedAt: demoRequest.createdAt,
      origin: demoRequest.origin,
      untrusted: false,
    },
  });
  expect(proof.entries.find((e) => e.kind === 'local-preservation')?.summary).toContain(
    'does not establish',
  );
});
