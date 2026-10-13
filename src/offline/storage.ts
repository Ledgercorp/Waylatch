import { openDB, type DBSchema } from 'idb';
import { z } from 'zod';
import { RequestSchema, type ResourceRequest } from '../requests/schema';
import { emptyReceiver, receive, type Receiver } from './reconstruction';

export type ImportProvenance = {
  source: 'local' | 'qr-import';
  recordedAt: string;
  origin: string;
  untrusted: boolean;
};
export type OutboxEntry = {
  request: ResourceRequest;
  provenance: ImportProvenance;
  syncStatus: 'pending';
};
interface LedgerDB extends DBSchema {
  requests: { key: string; value: OutboxEntry };
  receiver: { key: string; value: { packets: number[][]; duplicates: number } };
}
const DATABASE = 'rescueledger-field-v1';
async function database() {
  return openDB<LedgerDB>(DATABASE, 1, {
    upgrade(db) {
      db.createObjectStore('requests', { keyPath: 'request.id' });
      db.createObjectStore('receiver');
    },
  });
}
/** Local preservation only; no network or financial actions occur here. */
export async function saveRequest(
  input: ResourceRequest,
  source: ImportProvenance['source'] = 'local',
): Promise<OutboxEntry> {
  const request = RequestSchema.parse(input);
  const db = await database();
  try {
    const transaction = db.transaction('requests', 'readwrite');
    const prior = await transaction.store.get(request.id);
    if (
      prior &&
      (prior.request.revision > request.revision ||
        (prior.request.revision === request.revision &&
          JSON.stringify(prior.request) !== JSON.stringify(request)))
    ) {
      transaction.abort();
      await transaction.done.catch(() => undefined);
      throw new Error('Local request revision conflict');
    }
    if (prior?.request.revision === request.revision) {
      await transaction.done;
      return prior;
    }
    const entry: OutboxEntry = {
      request,
      provenance: {
        source,
        recordedAt: new Date().toISOString(),
        origin: request.origin,
        untrusted: source === 'qr-import',
      },
      syncStatus: 'pending',
    };
    await transaction.store.put(entry);
    await transaction.done;
    return entry;
  } finally {
    db.close();
  }
}
export async function getOutbox(): Promise<OutboxEntry[]> {
  const db = await database();
  try {
    return await db.getAll('requests');
  } finally {
    db.close();
  }
}
export async function getRequests(): Promise<ResourceRequest[]> {
  return (await getOutbox()).map((entry) => RequestSchema.parse(entry.request));
}
export async function saveReceiver(state: Receiver, session = 'default'): Promise<void> {
  const packets = Object.values(state.seen);
  // Reparse complete envelopes and reconstruct before persisting caller-supplied state.
  packets.reduce((current, bytes) => receive(current, Uint8Array.from(bytes)), emptyReceiver());
  const db = await database();
  try {
    await db.put('receiver', { packets, duplicates: state.duplicates }, session);
  } finally {
    db.close();
  }
}
const SavedReceiverSchema = z.strictObject({
  packets: z.array(z.array(z.number().int().min(0).max(255)).min(14).max(600)).max(1024),
  duplicates: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});
export async function loadReceiver(session = 'default'): Promise<Receiver> {
  const db = await database();
  try {
    const raw = await db.get('receiver', session);
    if (!raw) return emptyReceiver();
    const saved = SavedReceiverSchema.parse(raw);
    const state = saved.packets.reduce(
      (current, bytes) => receive(current, Uint8Array.from(bytes)),
      emptyReceiver(),
    );
    return { ...state, duplicates: saved.duplicates };
  } finally {
    db.close();
  }
}
