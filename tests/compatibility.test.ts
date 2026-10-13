import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fixture from './fixtures/rescueledger-v1.json';
import { getOutbox, loadReceiver } from '../src/offline/storage';
import { fromText } from '../src/offline/codec';
import {
  receive,
  emptyReceiver,
  reconstructedRequest,
  coverage,
} from '../src/offline/reconstruction';
import { validateChain, type AuditEvent } from '../src/audit/chain';
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase('rescueledger-field-v1');
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});
describe('Waylatch preserves authentic RescueLedger v1 contracts', () => {
  it('loads legacy IndexedDB requests and provenance without migrating or rewriting', async () => {
    const db = await openDB('rescueledger-field-v1', 1, {
      upgrade(d) {
        d.createObjectStore('requests', { keyPath: 'request.id' });
        d.createObjectStore('receiver');
      },
    });
    await db.put('requests', fixture.outbox);
    db.close();
    expect(await getOutbox()).toEqual([fixture.outbox]);
  });
  it('replays a legacy partial receiver and completes pinned RL1 packets', async () => {
    const db = await openDB('rescueledger-field-v1', 1, {
      upgrade(d) {
        d.createObjectStore('requests', { keyPath: 'request.id' });
        d.createObjectStore('receiver');
      },
    });
    await db.put('receiver', fixture.receiver, 'default');
    db.close();
    const restored = await loadReceiver();
    expect(restored.duplicates).toBe(1);
    expect(coverage(restored).complete).toBe(false);
    const complete = fixture.packets.map(fromText).reduce(receive, restored);
    expect(reconstructedRequest(complete)).toEqual(fixture.request);
  });
  it('imports historical wire bytes and rejects a corrupted historical packet', () => {
    expect(
      reconstructedRequest(fixture.packets.map(fromText).reduce(receive, emptyReceiver())),
    ).toEqual(fixture.request);
    const bytes = fromText(fixture.packets[0]);
    bytes[bytes.length - 1] ^= 1;
    expect(() => receive(emptyReceiver(), bytes)).toThrow('integrity');
  });
  it('validates historical RescueLedger event hashes without renaming event data', () => {
    const events = structuredClone(fixture.events) as AuditEvent[];
    expect(validateChain(events).valid).toBe(true);
    (events[0].data as any).product = 'Waylatch';
    expect(validateChain(events).valid).toBe(false);
  });
  it('exposes the Waylatch browser and PWA identity without financial authority in metadata', () => {
    const html = readFileSync(resolve('index.html'), 'utf8');
    expect(html).toContain('Waylatch');
    expect(html).toContain('/manifest.webmanifest');
    const manifest = JSON.parse(readFileSync(resolve('public/manifest.webmanifest'), 'utf8'));
    expect(manifest.name).toBe('Waylatch');
    expect(manifest.short_name).toBe('Waylatch');
    expect(manifest.start_url).toBe('/');
    expect(html).not.toContain('PAYPAL_CLIENT_SECRET');
  });
});
