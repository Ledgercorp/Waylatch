import 'fake-indexeddb/auto';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store';
import { demoRequest } from '../src/requests/schema';
import { validateChain } from '../src/audit/chain';
import {
  durablePaymentFaultScenario,
  interruptedTransferScenario,
  reservedOperationRecoveryScenario,
} from '../scripts/measure-resilience';

let root: string;
beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'waylatch-resilience-test-'));
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('rescueledger-field-v1');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('competitive resilience: controlled faults, no real provider', () => {
  it('resumes large interrupted transfers through repeated persisted checkpoints and rejects old revision replay', async () => {
    const evidence = await interruptedTransferScenario('focused-test');
    expect(evidence.packets).toBeGreaterThan(40);
    expect(evidence.checkpoints).toBeGreaterThan(5);
    expect(evidence.finalOutboxRevision).toBe(2);
    expect(evidence.malformedRejectedWithoutMutation).toBe(true);
  });
  it('preserves uncertain create/capture states and idempotency through durable restarts without automatic provider execution', async () => {
    const evidence = await durablePaymentFaultScenario(join(root, 'fault.sqlite'));
    expect(evidence).toMatchObject({
      logicalOrders: 1,
      logicalCaptures: 1,
      restarts: 3,
      startupProviderCalls: 0,
      createCalls: 2,
      captureCalls: 1,
      inspectCalls: 2,
      finalState: 'PAID',
      auditValid: true,
    });
  });
  it('recovers both reserved operation states without contacting a provider and without appending repeated recovery events', () => {
    expect(reservedOperationRecoveryScenario(join(root, 'reserved.sqlite'))).toMatchObject({
      providerCalls: 0,
      auditEvents: 2,
      recoveryIsIdempotent: true,
      recoveredStates: ['CREATE_UNCERTAIN', 'CAPTURE_UNCERTAIN'],
    });
  });
  it('rolls back a request and audit append together after a controlled transaction failure', () => {
    const store = new Store(join(root, 'rollback.sqlite'));
    try {
      store.append('existing_event', null, { simulation: true });
      expect(() =>
        store.atomic(() => {
          store.putRecord({
            record: demoRequest,
            provenance: 'local',
            status: 'pending',
            reviewNote: null,
          });
          store.append('request_submitted', demoRequest.id, { simulation: true });
          throw new Error('SIMULATED write failure before commit');
        }),
      ).toThrow('SIMULATED');
      expect(store.record(demoRequest.id)).toBeUndefined();
      expect(store.events()).toHaveLength(1);
      expect(validateChain(store.events()).valid).toBe(true);
    } finally {
      store.close();
    }
  });
  it('detects direct persisted audit-body modification after reopen and detects deletion/reordering independently', () => {
    const path = join(root, 'tampered.sqlite');
    let store = new Store(path);
    store.append('request_submitted', 'RL-SAFE01', { amountCents: 100 });
    store.append('human_review_recorded', 'RL-SAFE01', { simulation: true });
    const original = store.events();
    const corrupted = { ...original[0], data: { amountCents: 99999 } };
    store.db.prepare('UPDATE events SET body=? WHERE seq=1').run(JSON.stringify(corrupted));
    store.close();
    store = new Store(path);
    try {
      expect(validateChain(store.events())).toMatchObject({ valid: false, brokenAt: 1 });
      expect(validateChain(original.slice(1)).valid).toBe(false);
      expect(validateChain([...original].reverse()).valid).toBe(false);
      expect(validateChain(original).valid).toBe(true);
    } finally {
      store.close();
    }
  });
});
