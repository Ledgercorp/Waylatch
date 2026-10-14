import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { demoRequest } from '../src/requests/schema';
import { sameRequestSnapshot } from '../src/requests/snapshot';
import { PayPanel } from '../src/components/PayPanel';
import { ReviewPanel } from '../src/components/ReviewPanel';
import { buildProofTrail } from '../src/proof/trail';
const conflicting = {
  ...demoRequest,
  resources: [{ description: 'Different untrusted QR purchase', quantity: 24 }],
};
const remote = {
  record: demoRequest,
  provenance: 'local' as const,
  status: 'reviewed' as const,
  reviewNote: null,
};
test('snapshot equality ignores object property order but rejects equal-revision changed content', () => {
  expect(sameRequestSnapshot(demoRequest, { ...demoRequest })).toBe(true);
  expect(
    sameRequestSnapshot(demoRequest, {
      ...demoRequest,
      resources: demoRequest.resources.map((r) => ({
        quantity: r.quantity,
        description: r.description,
      })),
    }),
  ).toBe(true);
  expect(sameRequestSnapshot(demoRequest, conflicting)).toBe(false);
});
test('a conflicting local body cannot be assessed, reviewed or financially approved as the server snapshot', () => {
  const props = {
    record: conflicting,
    remote,
    authenticated: true,
    busy: false,
    act() {},
    async refresh() {},
  };
  const review = renderToStaticMarkup(createElement(ReviewPanel, props));
  expect(review).toContain('Local and coordinator snapshots differ');
  expect(review).not.toContain('Run local semantic review');
  expect(review).not.toContain('Mark reviewed');
  const pay = renderToStaticMarkup(createElement(PayPanel, { ...props, configured: true }));
  expect(pay).toContain('Coordinator snapshot mismatch');
  expect(pay.match(/<button[^>]*disabled=""/g)).toHaveLength(3);
});
test('a full conflicting outbox entry cannot establish provenance for the server body', () => {
  const proof = buildProofTrail({
    record: demoRequest,
    events: [],
    provenance: {
      request: conflicting,
      provenance: {
        source: 'qr-import',
        recordedAt: demoRequest.createdAt,
        origin: conflicting.origin,
        untrusted: true,
      },
      syncStatus: 'pending',
    },
  });
  expect(proof.entries.some((e) => e.source === 'browser-local')).toBe(false);
  expect(proof.gaps.join(' ')).toContain('different request snapshot');
});
