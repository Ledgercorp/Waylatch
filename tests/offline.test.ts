import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { encode } from '@msgpack/msgpack';
import { demoRequest, type ResourceRequest } from '../src/requests/schema';
import { buildPackets, decodePacket, encodePacket, fromText, toText } from '../src/offline/codec';
import {
  coverage,
  emptyReceiver,
  receive,
  reconstructedRequest,
} from '../src/offline/reconstruction';
import {
  getOutbox,
  clearDemoStorage,
  getRequests,
  loadReceiver,
  saveReceiver,
  saveRequest,
} from '../src/offline/storage';
import { packetQrDataUri } from '../src/offline/qr';

const assemble = (packets: Uint8Array[]) => packets.reduce(receive, emptyReceiver());
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const operation = indexedDB.deleteDatabase('rescueledger-field-v1');
    operation.onsuccess = () => resolve();
    operation.onerror = () => reject(operation.error);
  });
});
describe('disconnected handoff, local execution only', () => {
  it('reconstructs strictly validated requests from out-of-order text packets under the raw-byte budget', () => {
    const packets = buildPackets(demoRequest, 128);
    expect(packets.every((packet) => packet.length <= 128)).toBe(true);
    const state = assemble([...packets].reverse().map((packet) => fromText(toText(packet))));
    expect(coverage(state).complete).toBe(true);
    expect(reconstructedRequest(state)).toEqual(demoRequest);
  });
  it('exposes partial fields and missing information during interrupted fragment delivery', () => {
    const input: ResourceRequest = {
      ...demoRequest,
      resources: [
        { description: 'Water for families at the shelter '.repeat(12).trim(), quantity: null },
      ],
    };
    const packets = buildPackets(input, 128);
    const omitted = packets.findIndex((packet) => {
      const decoded = decodePacket(packet);
      return decoded.field === 'resources' && decoded.part === 1;
    });
    expect(omitted).toBeGreaterThan(0);
    const state = assemble(packets.filter((_, index) => index !== omitted));
    expect(coverage(state).complete).toBe(false);
    expect(coverage(state).missing).toEqual(['resources']);
    expect(coverage(state).available.incident).toBe(input.incident);
    expect(() => reconstructedRequest(state)).toThrow('incomplete');
    expect(reconstructedRequest(receive(state, packets[omitted]))).toEqual(input);
  });
  it('handles duplicate packets without duplicate records', () => {
    const packets = buildPackets(demoRequest);
    const state = assemble([...packets, ...packets]);
    expect(state.accepted).toBe(packets.length);
    expect(state.duplicates).toBe(packets.length);
    expect(reconstructedRequest(state)).toEqual(demoRequest);
  });
  it('rejects corruption, oversized bytes, invalid text, unsupported budgets and unexpected payload fields', () => {
    const packet = buildPackets(demoRequest)[0].slice();
    packet[packet.length - 1] ^= 1;
    expect(() => receive(emptyReceiver(), packet)).toThrow('integrity');
    expect(() => receive(emptyReceiver(), new Uint8Array(601))).toThrow('size');
    expect(() => fromText('CC1:AAAA')).toThrow();
    expect(() => fromText('RL1:' + 'A'.repeat(801))).toThrow();
    expect(() => buildPackets(demoRequest, 601)).toThrow('budget');
    expect(() => buildPackets({ ...demoRequest, approved: true } as ResourceRequest)).toThrow();
  });
  it('rejects conflicting equal-revision packets and field values encoded with a different span', () => {
    const packets = buildPackets(demoRequest);
    const original = packets.find((packet) => decodePacket(packet).field === 'incident')!;
    const state = receive(emptyReceiver(), original);
    const packet = decodePacket(original);
    expect(() =>
      receive(state, encodePacket({ ...packet, payload: encode('Different incident') })),
    ).toThrow('Conflicting packet');
    const changed = buildPackets({ ...demoRequest, incident: 'Different incident' }, 128).find(
      (value) => decodePacket(value).field === 'incident',
    )!;
    expect(() => receive(state, changed)).toThrow('Conflicting field');
  });
  it('starts a clean new revision without mixing old fields and rejects stale or different-request packets', () => {
    const state = assemble(buildPackets(demoRequest));
    const revised: ResourceRequest = { ...demoRequest, revision: 2, incident: 'UPDATED-FICTIONAL' };
    const packets = buildPackets(revised);
    const first = receive(state, packets[0]);
    expect(coverage(first).complete).toBe(false);
    expect(coverage(first).available).toEqual({});
    expect(() => receive(first, buildPackets(demoRequest)[0])).toThrow('Stale revision');
    expect(() => receive(first, buildPackets({ ...revised, id: 'RL-OTHER1' })[0])).toThrow(
      'different request',
    );
    expect(reconstructedRequest(packets.slice(1).reduce(receive, first))).toEqual(revised);
  });
  it('preserves explicit unknowns independently of missing packets', () => {
    const input: ResourceRequest = {
      ...demoRequest,
      amountCents: null,
      amountKind: 'unknown',
      urgency: 'unknown',
      incident: null,
      resources: [{ description: 'Medical kits', quantity: null }],
    };
    const result = coverage(assemble(buildPackets(input)));
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.unknown).toEqual(
      expect.arrayContaining(['incident', 'amountCents', 'amountKind', 'urgency']),
    );
    expect(result.unknownResourceQuantities).toEqual([0]);
  });
  it('persists offline requests and import provenance across database connections with no network calls', async () => {
    await saveRequest(demoRequest, 'qr-import');
    expect(await getRequests()).toEqual([demoRequest]);
    const outbox = await getOutbox();
    expect(outbox[0].provenance).toMatchObject({
      source: 'qr-import',
      untrusted: true,
      origin: demoRequest.origin,
    });
    expect(outbox[0].syncStatus).toBe('pending');
    await saveRequest(demoRequest, 'qr-import');
    expect(await getRequests()).toHaveLength(1);
    await expect(saveRequest({ ...demoRequest, amountCents: 100 })).rejects.toThrow(
      'revision conflict',
    );
    await saveRequest({ ...demoRequest, revision: 2 });
    await expect(saveRequest(demoRequest)).rejects.toThrow('revision conflict');
  });
  it('persists a partial receiver, reloads it, and completes the interrupted handoff', async () => {
    const packets = buildPackets(demoRequest, 128);
    const partial = packets.slice(0, 4).reduce(receive, emptyReceiver());
    await saveReceiver(receive(partial, packets[0]));
    const restored = await loadReceiver();
    expect(restored).toEqual({ ...partial, duplicates: 1 });
    const completed = packets.slice(4).reduce(receive, restored);
    await saveReceiver(completed);
    expect(reconstructedRequest(await loadReceiver())).toEqual(demoRequest);
  });
  it('creates an actual QR PNG for bounded packet text', async () => {
    expect(await packetQrDataUri(buildPackets(demoRequest)[0])).toMatch(/^data:image\/png;base64,/);
  });
  it('resets fictional outbox and every QR receiver without deleting unrelated origin data', async () => {
    await saveRequest(demoRequest);
    const partial = receive(emptyReceiver(), buildPackets(demoRequest)[0]);
    await saveReceiver(partial);
    await saveReceiver(partial, 'second-receiver');
    const unrelated = indexedDB.open('unrelated-app', 1);
    await new Promise<void>((resolve) => {
      unrelated.onsuccess = () => {
        unrelated.result.close();
        resolve();
      };
    });
    await clearDemoStorage();
    expect(await getOutbox()).toEqual([]);
    expect(await loadReceiver()).toEqual(emptyReceiver());
    expect(await loadReceiver('second-receiver')).toEqual(emptyReceiver());
    expect((await indexedDB.databases()).some((db) => db.name === 'unrelated-app')).toBe(true);
  });
});
