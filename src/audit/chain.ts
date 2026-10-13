export type AuditEvent = {
  seq: number;
  at: string;
  type: string;
  recordId: string | null;
  data: unknown;
  previous: string;
  hash: string;
};
export function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k]))
        .join(',') +
      '}'
    );
  throw new Error('Audit value is not canonical JSON');
}
// SHA-256 is supplied by Node below; browser validates through the independent endpoint.
import { createHash } from 'node:crypto';
export function eventHash(event: Omit<AuditEvent, 'hash'>) {
  return createHash('sha256').update(canonical(event)).digest('hex');
}
export function validateChain(events: AuditEvent[]) {
  let previous = '0'.repeat(64);
  for (let i = 0; i < events.length; i++) {
    const { hash, ...body } = events[i];
    if (body.seq !== i + 1 || body.previous !== previous || hash !== eventHash(body))
      return { valid: false, brokenAt: i + 1, count: events.length };
    previous = hash;
  }
  return { valid: true, brokenAt: null, count: events.length };
}
