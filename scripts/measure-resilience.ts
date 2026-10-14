/** Free local measurements. Provider outcomes below are controlled doubles, never PayPal. */
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync, statfsSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir, cpus, platform, release, totalmem } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Store, type Payment } from '../server/store';
import { Payments } from '../server/payments';
import type { Order, PayPalProvider } from '../server/paypal';
import { demoRequest, type ResourceRequest } from '../src/requests/schema';
import { buildPackets, decodePacket, fromText, toText } from '../src/offline/codec';
import {
  coverage,
  emptyReceiver,
  receive,
  reconstructedRequest,
} from '../src/offline/reconstruction';
import { loadReceiver, saveReceiver, saveRequest, getOutbox } from '../src/offline/storage';
import { validateChain } from '../src/audit/chain';

export function largeRequest(id = 'RL-STRESS01'): ResourceRequest {
  return {
    ...demoRequest,
    id,
    resources: Array.from({ length: 20 }, (_, index) => ({
      description: (`Fictional supply ${index + 1} ` + 'bounded packet handoff '.repeat(25)).slice(
        0,
        500,
      ),
      quantity: index + 1,
    })),
  };
}

/** Persistence in fake IndexedDB is a controlled storage test, not a browser-reload claim. */
export async function interruptedTransferScenario(session = 'competitive-stress') {
  const input = largeRequest();
  const packets = buildPackets(input, 256);
  const missingIndex = packets.findIndex((bytes) => {
    const packet = decodePacket(bytes);
    return packet.field === 'resources' && packet.part === 1;
  });
  assert(missingIndex > 0);
  let state = emptyReceiver();
  let checkpoints = 0;
  for (const [index, packet] of [...packets].reverse().entries()) {
    if (decodePacket(packet).field === 'resources' && decodePacket(packet).part === 1) continue;
    state = receive(receive(state, fromText(toText(packet))), packet);
    if (index % 5 === 0) {
      await saveReceiver(state, session);
      state = await loadReceiver(session);
      checkpoints++;
    }
  }
  await saveReceiver(state, session);
  state = await loadReceiver(session);
  assert.deepEqual(coverage(state).missing, ['resources']);
  assert.throws(() => reconstructedRequest(state), /incomplete/);
  const acceptedBefore = state.accepted;
  const malformed = packets[missingIndex].slice();
  malformed[malformed.length - 1] ^= 1;
  assert.throws(() => receive(state, malformed), /integrity/);
  assert.equal(state.accepted, acceptedBefore);
  state = receive(state, packets[missingIndex]);
  assert.deepEqual(reconstructedRequest(state), input);
  await saveRequest(input, 'qr-import');
  await saveRequest(input, 'qr-import');
  await assert.rejects(
    saveRequest({ ...input, incident: 'CONFLICT-FICTIONAL' }, 'qr-import'),
    /revision conflict/,
  );
  const revised = { ...input, revision: 2, incident: 'REVISION-TWO-FICTIONAL' };
  const newPackets = buildPackets(revised, 256);
  state = receive(state, newPackets[0]);
  await saveReceiver(state, session);
  state = await loadReceiver(session);
  assert.equal(coverage(state).complete, false);
  assert.deepEqual(coverage(state).available, {});
  assert.throws(() => receive(state, packets[0]), /Stale revision/);
  state = newPackets.slice(1).reduce(receive, state);
  assert.deepEqual(reconstructedRequest(state), revised);
  await saveRequest(revised, 'qr-import');
  await assert.rejects(saveRequest(input, 'qr-import'), /revision conflict/);
  const stored = (await getOutbox()).find((entry) => entry.request.id === input.id);
  assert.equal(stored?.request.revision, 2);
  return {
    simulatedStorage: 'fake-indexeddb; connection close/reopen, not a real browser reload',
    packetBudgetBytes: 256,
    packets: packets.length,
    rawBytes: packets.reduce((total, packet) => total + packet.length, 0),
    checkpoints,
    duplicatePacketsIgnored: packets.length - 1,
    malformedRejectedWithoutMutation: true,
    missingFieldBeforeCompletion: 'resources',
    equalRevisionConflictRejected: true,
    staleRevisionRejectedAfterCheckpoint: true,
    finalOutboxRevision: stored?.request.revision,
  };
}

/** Remote acceptance followed by a lost response is simulated entirely in this process. */
export async function durablePaymentFaultScenario(path: string) {
  let store = new Store(path);
  let orderInput: Parameters<PayPalProvider['createOrder']>[0] | undefined;
  let acceptedOrder = false;
  let acceptedCapture = false;
  let createCalls = 0;
  let captureCalls = 0;
  let inspectCalls = 0;
  const createKeys: string[] = [];
  const representation = (): Order => ({
    id: 'SIM-DURABLE-ORDER',
    status: acceptedCapture ? 'COMPLETED' : 'APPROVED',
    purchase_units: [
      {
        custom_id: orderInput!.reference,
        amount: { currency_code: 'USD', value: (orderInput!.amountCents / 100).toFixed(2) },
        ...(acceptedCapture
          ? {
              payments: {
                captures: [
                  {
                    id: 'SIM-DURABLE-CAPTURE',
                    status: 'COMPLETED',
                    final_capture: true,
                    amount: {
                      currency_code: 'USD',
                      value: (orderInput!.amountCents / 100).toFixed(2),
                    },
                  },
                ],
              },
            }
          : {}),
      },
    ],
    links: [
      {
        rel: 'approve',
        href: 'https://www.sandbox.paypal.com/checkoutnow?token=SIM-DURABLE-ORDER',
      },
    ],
  });
  const provider: PayPalProvider = {
    configured: true,
    async createOrder(input) {
      createCalls++;
      createKeys.push(input.requestId);
      orderInput = input;
      if (!acceptedOrder) {
        acceptedOrder = true;
        throw new Error('SIMULATED: remote order accepted, response lost');
      }
      return representation();
    },
    async captureOrder() {
      captureCalls++;
      acceptedCapture = true;
      throw new Error('SIMULATED: remote capture accepted, response lost');
    },
    async getOrder() {
      inspectCalls++;
      return representation();
    },
    async verifyWebhook() {
      return false;
    },
  };
  const restart = () => {
    store.close();
    store = new Store(path);
    const payments = new Payments(store, provider, 'http://127.0.0.1:4173');
    payments.recoverInterrupted();
    return payments;
  };
  try {
    // Explicitly preapproved fictional fixture; no actual person or provider is impersonated.
    store.atomic(() => {
      store.putRecord({
        record: demoRequest,
        provenance: 'local',
        status: 'approved',
        reviewNote: 'Controlled test fixture',
      });
      store.append('test_fixture_approved', demoRequest.id, { simulation: true });
    });
    let payments = new Payments(store, provider, 'http://127.0.0.1:4173');
    await assert.rejects(payments.order(demoRequest.id), /SIMULATED/);
    assert.equal(store.payment(demoRequest.id)?.state, 'CREATE_UNCERTAIN');
    const reserved = store.payment(demoRequest.id)!;
    payments = restart();
    assert.equal(createCalls, 1);
    assert.equal(captureCalls, 0);
    assert.equal(inspectCalls, 0);
    await payments.order(demoRequest.id);
    assert.equal(new Set(createKeys).size, 1);
    assert.equal(store.payment(demoRequest.id)?.createKey, reserved.createKey);
    await assert.rejects(payments.capture(demoRequest.id), /SIMULATED/);
    assert.equal(store.payment(demoRequest.id)?.state, 'CAPTURE_UNCERTAIN');
    payments = restart();
    assert.equal(captureCalls, 1);
    assert.equal(inspectCalls, 1);
    await payments.inspect(demoRequest.id);
    assert.equal(store.payment(demoRequest.id)?.state, 'PAID');
    await payments.order(demoRequest.id);
    await payments.capture(demoRequest.id);
    assert.equal(createCalls, 2);
    assert.equal(captureCalls, 1);
    assert.equal(inspectCalls, 2);
    const paid = store.payment(demoRequest.id)!;
    const countBeforeRestart = store.events().length;
    payments = restart();
    assert.deepEqual(store.payment(demoRequest.id), paid);
    assert.equal(store.events().length, countBeforeRestart);
    assert.equal(validateChain(store.events()).valid, true);
    return {
      simulation: 'in-process provider double; no network calls',
      logicalOrders: 1,
      logicalCaptures: 1,
      createCalls,
      captureCalls,
      inspectCalls,
      restarts: 3,
      preservedCreateKey: true,
      startupProviderCalls: 0,
      finalState: paid.state,
      auditEvents: countBeforeRestart,
      auditValid: true,
      repeatOperationsCreatedNoNewPurchase: true,
    };
  } finally {
    store.close();
  }
}

export function reservedOperationRecoveryScenario(path: string) {
  let store = new Store(path);
  let calls = 0;
  const neverProvider: PayPalProvider = {
    configured: true,
    async createOrder() {
      calls++;
      throw new Error('No provider call permitted');
    },
    async captureOrder() {
      calls++;
      throw new Error('No provider call permitted');
    },
    async getOrder() {
      calls++;
      throw new Error('No provider call permitted');
    },
    async verifyWebhook() {
      calls++;
      return false;
    },
  };
  const at = new Date().toISOString();
  const fixture: Payment = {
    recordId: 'RL-RESERVED01',
    revision: 1,
    amountCents: 100,
    reference: 'RL-RESERVED01:1',
    state: 'CREATING',
    createKey: 'fixture-create-key',
    captureKey: 'fixture-capture-key',
    orderId: null,
    captureId: null,
    approvalUrl: null,
    startedAt: at,
    updatedAt: at,
    captureStartedAt: null,
    error: null,
  };
  store.putPayment(fixture);
  store.putPayment({
    ...fixture,
    recordId: 'RL-RESERVED02',
    reference: 'RL-RESERVED02:1',
    state: 'CAPTURING',
    orderId: 'SIM-RESERVED-ORDER',
    captureStartedAt: at,
  });
  store.close();
  store = new Store(path);
  try {
    // Persisted reserved states deliberately simulate a process interruption at that boundary.
    const payments = new Payments(store, neverProvider, 'http://127.0.0.1:4173');
    payments.recoverInterrupted();
    assert.equal(store.payment('RL-RESERVED01')?.state, 'CREATE_UNCERTAIN');
    assert.equal(store.payment('RL-RESERVED02')?.state, 'CAPTURE_UNCERTAIN');
    assert.equal(calls, 0);
    payments.recoverInterrupted();
    assert.equal(store.events().length, 2);
    assert.equal(validateChain(store.events()).valid, true);
    return {
      simulation: 'reserved database states simulate crash boundary; clean SQLite reopen',
      recoveredStates: store.payments().map((p) => p.state),
      providerCalls: calls,
      auditEvents: store.events().length,
      recoveryIsIdempotent: true,
    };
  } finally {
    store.close();
  }
}

function atomicAuditFaultScenario(path: string) {
  let store = new Store(path);
  const start = performance.now();
  try {
    store.append('existing_event', null, { simulation: true });
    assert.throws(
      () =>
        store.atomic(() => {
          store.putRecord({
            record: demoRequest,
            provenance: 'local',
            status: 'pending',
            reviewNote: null,
          });
          store.append('request_submitted', demoRequest.id, { simulation: true });
          throw new Error('SIMULATED transaction interruption');
        }),
      /SIMULATED/,
    );
    assert.equal(store.record(demoRequest.id), undefined);
    assert.equal(store.events().length, 1);
    store.append('human_review_recorded', 'RL-SAFE01', { simulation: true });
    const original = store.events();
    const modified = { ...original[0], data: { simulation: true, changed: true } };
    store.db.prepare('UPDATE events SET body=? WHERE seq=1').run(JSON.stringify(modified));
    store.close();
    store = new Store(path);
    assert.equal(validateChain(store.events()).valid, false);
    assert.equal(validateChain(original.slice(1)).valid, false);
    assert.equal(validateChain([...original].reverse()).valid, false);
    assert.equal(validateChain(original).valid, true);
    return {
      simulation: 'forced transaction exception and direct SQLite event-body edit',
      uncommittedRequestAndAuditRolledBack: true,
      changedBodyDetectedAfterReopen: true,
      deletedPrefixDetected: true,
      reorderedEventsDetected: true,
      elapsedMs: performance.now() - start,
      limitation:
        'Hash chains detect alteration relative to recorded hashes; a database administrator can rewrite an entire chain, and deleting an unanchored tail cannot be detected from the remaining valid prefix.',
    };
  } finally {
    store.close();
  }
}

function distribution(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    samples: samples.length,
    minMs: sorted[0],
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    maxMs: sorted.at(-1),
    rawMs: samples,
  };
}

export async function measureResilience(outputPath?: string) {
  const root = mkdtempSync(join(tmpdir(), 'waylatch-competitive-resilience-'));
  const startedAt = new Date().toISOString();
  const cpuStart = process.cpuUsage();
  const memoryBefore = process.memoryUsage();
  const totalStart = performance.now();
  try {
    const faults = {
      transfer: await interruptedTransferScenario(),
      payment: await durablePaymentFaultScenario(join(root, 'fault.sqlite')),
      reservedRecovery: reservedOperationRecoveryScenario(join(root, 'reserved.sqlite')),
      transactionAndAudit: atomicAuditFaultScenario(join(root, 'audit-fault.sqlite')),
    };
    const storeMeasurements = [];
    for (const count of [100, 500, 1000]) {
      const writes: number[] = [],
        reads: number[] = [],
        validations: number[] = [],
        reopen: number[] = [];
      let fileBytes = 0;
      for (let repeat = 0; repeat < 7; repeat++) {
        const path = join(root, `bounded-${count}-${repeat}.sqlite`);
        let store = new Store(path);
        let start = performance.now();
        for (let i = 0; i < count; i++) {
          const record = { ...demoRequest, id: `RL-BOUNDED-${String(i).padStart(5, '0')}` };
          store.atomic(() => {
            store.putRecord({ record, provenance: 'local', status: 'pending', reviewNote: null });
            store.append('request_submitted', record.id, { revision: 1, simulation: true });
          });
        }
        writes.push(performance.now() - start);
        start = performance.now();
        const records = store.records();
        const events = store.events();
        reads.push(performance.now() - start);
        assert.equal(records.length, count);
        start = performance.now();
        assert.equal(validateChain(events).valid, true);
        validations.push(performance.now() - start);
        store.close();
        start = performance.now();
        store = new Store(path);
        assert.equal(store.records().length, count);
        reopen.push(performance.now() - start);
        store.close();
        fileBytes = statSync(path).size;
      }
      storeMeasurements.push({
        count,
        databaseFileBytesAfterClose: fileBytes,
        writeRecordsAndAudit: distribution(writes),
        readAllRecordsAndEvents: distribution(reads),
        validateCompleteChain: distribution(validations),
        reopenAndReadRecords: distribution(reopen),
      });
    }
    const qrTimes: number[] = [];
    let qrPackets = 0;
    for (let repeat = 0; repeat < 25; repeat++) {
      const input = largeRequest(`RL-QR-${String(repeat).padStart(4, '0')}`);
      const start = performance.now();
      const packets = buildPackets(input, 256);
      const receiver = packets.slice().reverse().reduce(receive, emptyReceiver());
      assert.deepEqual(reconstructedRequest(receiver), input);
      qrTimes.push(performance.now() - start);
      qrPackets = packets.length;
    }
    const evidence = {
      schemaVersion: 1,
      startedAt,
      completedAt: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: platform(),
        kernel: release(),
        architecture: process.arch,
        cpuModel: cpus()[0]?.model,
        logicalCpusVisible: cpus().length,
        systemMemoryBytesVisible: totalmem(),
        temporaryFilesystemTypeHex: '0x' + statfsSync(root).type.toString(16),
        temporaryFilesystem:
          statfsSync(root).type === 0x01021994
            ? 'tmpfs (memory-backed)'
            : 'filesystem not identified',
      },
      sourceSha256: Object.fromEntries(
        [
          'scripts/measure-resilience.ts',
          'server/store.ts',
          'server/payments.ts',
          'src/offline/codec.ts',
          'src/offline/reconstruction.ts',
          'src/offline/storage.ts',
          'src/audit/chain.ts',
        ].map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]),
      ),
      scope:
        'Free local controlled synthetic requests, fake IndexedDB and isolated temporary SQLite. No PayPal API calls or real purchases.',
      faults,
      storeMeasurements,
      qr: {
        description:
          '20 resources, each 500 characters; raw packet budget 256 bytes; reverse-order delivery',
        packetsPerRequest: qrPackets,
        encodeAndReconstruct: distribution(qrTimes),
      },
      processResources: {
        totalWallMs: performance.now() - totalStart,
        cpuMicroseconds: process.cpuUsage(cpuStart),
        memoryBeforeBytes: memoryBefore,
        memoryAfterBytes: process.memoryUsage(),
        lifetimeMaximumResidentSetKilobytes: process.resourceUsage().maxRSS,
      },
      limitations: [
        'Single worker, one run; timing samples share process/cache and are not independent deployment trials.',
        'Seven samples per store size; reported p95 is the largest observation, not a stable tail estimate.',
        'Memory is sampled before/after; lifetime maxRSS includes imports and is not isolated scenario peak memory.',
        'Synchronous SQLite measurements are single-writer; no multi-user concurrency or network latency simulated.',
        'Temporary SQLite files in this run use the worker temporary filesystem (identified in metadata). These timings do not establish physical-disk durability or end-user device performance.',
        'Maximum-size QR payload tests raw packet encoding/reconstruction, not camera scanning or visual QR readability.',
        'fake-indexeddb verifies persistence across connections, not actual browser reload or power-loss durability.',
        'Provider acceptance/response loss and persisted crash-boundary states are controlled simulations; no actual PayPal fault was induced.',
        'No model-startup or inference-performance claim is included in these measurements.',
      ],
    };
    if (outputPath) writeFileSync(resolve(outputPath), JSON.stringify(evidence, null, 2) + '\n');
    return evidence;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = process.argv[2] ?? 'docs/evidence/competitive-resilience.json';
  const report = await measureResilience(output);
  console.log(
    JSON.stringify(
      {
        output,
        completedAt: report.completedAt,
        elapsedMs: report.processResources.totalWallMs,
        storeCounts: report.storeMeasurements.map((m) => m.count),
        faults: report.faults,
      },
      null,
      2,
    ),
  );
}
