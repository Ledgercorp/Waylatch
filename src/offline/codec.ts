// Selectively adapted from CrisisCodec 8ca845c src/core/codec.ts; see docs/CRISISCODEC_REUSE.md.
import { encode, decode } from '@msgpack/msgpack';
import { RequestSchema, type ResourceRequest } from '../requests/schema';

export const MAX_PACKET_BYTES = 600;
export const MAX_FRAGMENTS = 64;
export const MAX_FIELD_BYTES = 32768;
export const FIELDS = [
  'kind',
  'incident',
  'resources',
  'urgency',
  'amountCents',
  'amountKind',
  'currency',
  'location',
  'origin',
  'createdAt',
  'receiptDigest',
  'transactionReference',
  'expenseAt',
] as const;
export type RequestField = (typeof FIELDS)[number];
export type Field = RequestField | 'manifest';
export type Packet = {
  id: string;
  revision: number;
  field: Field;
  part: number;
  total: number;
  span: number;
  payload: Uint8Array;
};

/** Accidental corruption detection only. CRC32 provides no source authentication. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function encodePacket(packet: Packet): Uint8Array {
  const body = encode([
    1,
    packet.id,
    packet.revision,
    packet.field === 'manifest' ? 0 : FIELDS.indexOf(packet.field) + 1,
    packet.part,
    packet.total,
    packet.payload,
    packet.span,
  ]);
  const bytes = new Uint8Array(body.length + 4);
  bytes.set(body);
  new DataView(bytes.buffer).setUint32(body.length, crc32(body));
  if (bytes.length > MAX_PACKET_BYTES) throw new Error('Packet exceeds 600-byte raw limit');
  return bytes;
}
export function decodePacket(bytes: Uint8Array): Packet {
  if (bytes.length < 14 || bytes.length > MAX_PACKET_BYTES) throw new Error('Invalid packet size');
  const body = bytes.slice(0, -4);
  if (
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(bytes.length - 4) !==
    crc32(body)
  )
    throw new Error('Packet integrity check failed');
  const value = decode(body, {
    maxArrayLength: 8,
    maxMapLength: 0,
    maxStrLength: 96,
    maxBinLength: MAX_PACKET_BYTES,
  });
  if (
    !Array.isArray(value) ||
    value.length !== 8 ||
    value[0] !== 1 ||
    typeof value[1] !== 'string' ||
    !/^[a-zA-Z0-9_-]{6,48}$/.test(value[1]) ||
    !Number.isInteger(value[2]) ||
    value[2] < 1 ||
    value[2] > 1000000 ||
    !Number.isInteger(value[3]) ||
    value[3] < 0 ||
    value[3] > FIELDS.length ||
    !Number.isInteger(value[4]) ||
    !Number.isInteger(value[5]) ||
    value[5] < 1 ||
    value[5] > MAX_FRAGMENTS ||
    value[4] < 0 ||
    value[4] >= value[5] ||
    !(value[6] instanceof Uint8Array) ||
    !Number.isInteger(value[7]) ||
    value[7] < 1 ||
    value[7] > MAX_PACKET_BYTES ||
    value[6].length < 1 ||
    value[6].length > value[7] ||
    (value[4] < value[5] - 1 && value[6].length !== value[7])
  )
    throw new Error('Invalid packet envelope');
  return {
    id: value[1],
    revision: value[2],
    field: value[3] === 0 ? 'manifest' : FIELDS[value[3] - 1],
    part: value[4],
    total: value[5],
    payload: value[6],
    span: value[7],
  };
}
export function decodeValue(bytes: Uint8Array): unknown {
  if (bytes.length > MAX_FIELD_BYTES) throw new Error('Field payload limit exceeded');
  return decode(bytes, {
    maxStrLength: MAX_FIELD_BYTES,
    maxArrayLength: 128,
    maxMapLength: 32,
    maxBinLength: 0,
  });
}
export function buildPackets(input: ResourceRequest, budget = MAX_PACKET_BYTES): Uint8Array[] {
  const request = RequestSchema.parse(input);
  if (!Number.isInteger(budget) || budget < 128 || budget > MAX_PACKET_BYTES)
    throw new Error('Packet budget must be 128–600 bytes');
  const packets: Uint8Array[] = [];
  for (const field of ['manifest', ...FIELDS] as Field[]) {
    const payload = encode(field === 'manifest' ? [...FIELDS] : request[field], { sortKeys: true });
    if (payload.length > MAX_FIELD_BYTES) throw new Error('Field payload limit exceeded');
    const span =
      budget -
      encodePacket({
        id: request.id,
        revision: request.revision,
        field,
        part: MAX_FRAGMENTS - 1,
        total: MAX_FRAGMENTS,
        span: MAX_PACKET_BYTES,
        payload: new Uint8Array(),
      }).length -
      4;
    if (span < 1) throw new Error('Packet budget cannot fit envelope');
    const total = Math.ceil(payload.length / span);
    if (total > MAX_FRAGMENTS) throw new Error('Too many field fragments');
    for (let part = 0; part < total; part++) {
      const bytes = encodePacket({
        id: request.id,
        revision: request.revision,
        field,
        part,
        total,
        span,
        payload: payload.slice(part * span, (part + 1) * span),
      });
      if (bytes.length > budget) throw new Error('Encoded packet exceeds budget');
      packets.push(bytes);
    }
  }
  return packets;
}
export function toText(bytes: Uint8Array): string {
  decodePacket(bytes);
  return 'RL1:' + btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}
export function fromText(text: string): Uint8Array {
  if (
    !text.startsWith('RL1:') ||
    text.length > 804 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(text.slice(4))
  )
    throw new Error('Invalid Waylatch packet text');
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(text.slice(4)), (character) => character.charCodeAt(0));
  } catch {
    throw new Error('Invalid packet base64');
  }
  decodePacket(bytes);
  return bytes;
}
