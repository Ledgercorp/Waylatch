// Selectively adapted from CrisisCodec 8ca845c src/core/reconstruction.ts.
import { RequestSchema, type ResourceRequest } from '../requests/schema';
import { decodePacket, decodeValue, FIELDS, MAX_FIELD_BYTES, type RequestField } from './codec';

type Assembly = { total: number; parts: Record<number, number[]> };
export type Receiver = {
  id: string | null;
  revision: number;
  manifest: boolean;
  facts: Partial<Omit<ResourceRequest, 'id' | 'revision'>>;
  assemblies: Record<string, Assembly>;
  seen: Record<string, number[]>;
  accepted: number;
  duplicates: number;
};
export function emptyReceiver(): Receiver {
  return {
    id: null,
    revision: 0,
    manifest: false,
    facts: {},
    assemblies: {},
    seen: {},
    accepted: 0,
    duplicates: 0,
  };
}
export function receive(state: Receiver, bytes: Uint8Array): Receiver {
  const packet = decodePacket(bytes);
  if (state.id && state.id !== packet.id)
    throw new Error('Packet belongs to a different request; reset receiver');
  if (packet.revision < state.revision) throw new Error('Stale revision rejected');
  const base = packet.revision > state.revision ? emptyReceiver() : state;
  const key = `${packet.field}:${packet.span}:${packet.part}`;
  if (base.seen[key]) {
    if (
      base.seen[key].length !== bytes.length ||
      base.seen[key].some((byte, index) => byte !== bytes[index])
    )
      throw new Error('Conflicting packet with equal revision');
    return { ...base, duplicates: base.duplicates + 1 };
  }
  const next: Receiver = {
    ...base,
    id: packet.id,
    revision: packet.revision,
    facts: { ...base.facts },
    assemblies: { ...base.assemblies },
    seen: { ...base.seen, [key]: Array.from(bytes) },
    accepted: base.accepted + 1,
  };
  if (
    Object.keys(next.seen).length > 1024 ||
    Object.values(next.seen).reduce((sum, value) => sum + value.length, 0) > 262144
  )
    throw new Error('Receiver packet history limit reached');
  const group = `${packet.field}:${packet.span}`;
  const previous = next.assemblies[group];
  if (previous && previous.total !== packet.total) throw new Error('Conflicting fragment count');
  const assembly = {
    total: packet.total,
    parts: { ...previous?.parts, [packet.part]: Array.from(packet.payload) },
  };
  next.assemblies[group] = assembly;
  if (Object.keys(next.assemblies).length > 64) throw new Error('Receiver assembly limit reached');
  if (Object.values(assembly.parts).reduce((sum, part) => sum + part.length, 0) > MAX_FIELD_BYTES)
    throw new Error('Field payload limit exceeded');
  if (Object.keys(assembly.parts).length === packet.total) {
    const value = decodeValue(
      Uint8Array.from(
        Array.from({ length: packet.total }, (_, part) => assembly.parts[part]).flat(),
      ),
    );
    if (packet.field === 'manifest') {
      if (JSON.stringify(value) !== JSON.stringify(FIELDS))
        throw new Error('Invalid request delivery manifest');
      next.manifest = true;
    } else {
      const validated = RequestSchema.shape[packet.field].parse(value);
      if (
        Object.hasOwn(next.facts, packet.field) &&
        JSON.stringify(next.facts[packet.field]) !== JSON.stringify(validated)
      )
        throw new Error('Conflicting field with equal revision');
      Object.assign(next.facts, { [packet.field]: validated });
    }
  }
  return next;
}
export function coverage(state: Receiver) {
  const delivered = FIELDS.filter((field) => Object.hasOwn(state.facts, field));
  const missing = FIELDS.filter((field) => !delivered.includes(field));
  const unknown = delivered.filter(
    (field) => state.facts[field] === null || state.facts[field] === 'unknown',
  );
  const unknownResourceQuantities =
    state.facts.resources?.flatMap((resource, index) =>
      resource.quantity === null ? [index] : [],
    ) ?? [];
  return {
    delivered,
    missing,
    unknown,
    unknownResourceQuantities,
    complete: state.manifest && missing.length === 0,
    manifestMissing: !state.manifest,
    available: { ...state.facts },
    accepted: state.accepted,
    duplicates: state.duplicates,
    id: state.id,
    revision: state.revision,
  };
}
export function reconstructedRequest(state: Receiver): ResourceRequest {
  if (!coverage(state).complete) throw new Error('Request handoff is incomplete');
  return RequestSchema.parse({ id: state.id, revision: state.revision, ...state.facts });
}
export type { RequestField };
