import { describe, expect, it } from 'vitest';
import { RequestSchema, demoRequest } from '../src/requests/schema';
describe('untrusted procurement schema', () => {
  it('preserves explicitly unknown quantities and amounts', () => {
    const r = RequestSchema.parse({
      ...demoRequest,
      amountCents: null,
      amountKind: 'unknown',
      resources: [{ description: 'Water', quantity: null }],
    });
    expect(r.amountCents).toBeNull();
    expect(r.resources[0].quantity).toBeNull();
  });
  it('rejects authority, fractional cents and contradictory estimates', () => {
    expect(() => RequestSchema.parse({ ...demoRequest, approved: true })).toThrow();
    expect(() => RequestSchema.parse({ ...demoRequest, amountCents: 1.1 })).toThrow();
    expect(() =>
      RequestSchema.parse({ ...demoRequest, amountCents: null, amountKind: 'exact' }),
    ).toThrow();
  });
});
