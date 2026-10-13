import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { PairComparison } from '../src/components/PairComparison';
import { ReviewPanel } from '../src/components/ReviewPanel';
import { demoRequest } from '../src/requests/schema';

const candidate = {
  ...demoRequest,
  id: 'OTHER01',
  resources: [{ description: 'Water <script>alert("x")</script> café', quantity: null }],
};
const props = {
  record: demoRequest,
  candidate,
  authenticated: true,
  busy: false,
  canPersist: true,
  act: () => {},
  refresh: async () => {},
  relationshipEvents: [],
};

test('comparison renders escaped source text, missing context and an explicit unrun AI status', () => {
  const html = renderToStaticMarkup(createElement(PairComparison, props));
  expect(html.replace(/<[^>]*>/g, '')).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
  expect(html).toContain('AI similarity not run');
  expect(html).toContain('Missing evidence');
  expect(html).toContain('Record pair disposition');
  expect(html).toContain('not proof of duplication');
  expect(html).not.toContain('Semantic cosine');
});

test('fallback does not display a supplied score as real inference or absence of a duplicate', () => {
  const html = renderToStaticMarkup(
    createElement(PairComparison, {
      ...props,
      mode: 'deterministic-only',
      assessment: { id: candidate.id, similarity: 0.9, reasons: [], reviewRecommended: false },
    }),
  );
  expect(html).toContain('Deterministic evidence');
  expect(html).toContain('No semantic inference executed');
  expect(html).not.toContain('Semantic cosine');
  expect(html).not.toContain('No duplicate signal');
});

test('real inference labels cosine as advisory, not a fraud probability', () => {
  const html = renderToStaticMarkup(
    createElement(PairComparison, {
      ...props,
      mode: 'semantic-local',
      assessment: {
        id: candidate.id,
        similarity: 0.789,
        reasons: ['Same incident'],
        reviewRecommended: true,
      },
    }),
  );
  expect(html).toContain('AI · local semantic inference');
  expect(html).toContain('Semantic cosine 0.789');
  expect(html).toContain('not a fraud probability');
  expect(html).toContain('Same incident');
});

test('unauthenticated pair notes are disabled without blocking read-only evidence', () => {
  const html = renderToStaticMarkup(
    createElement(PairComparison, { ...props, authenticated: false }),
  );
  expect(html).toContain('Sign in as coordinator');
  expect(html).toContain('disabled=""');
  expect(html).toContain(candidate.id);
});

test('existing review integrates snapshot comparisons without changing human review actions', () => {
  const html = renderToStaticMarkup(
    createElement(ReviewPanel, {
      record: demoRequest,
      remote: { record: demoRequest, status: 'approved', provenance: 'local', reviewNote: null },
      comparisonRecords: [
        { record: candidate, status: 'pending', provenance: 'local', reviewNote: null },
      ],
      authenticated: true,
      busy: false,
      act: () => {},
      refresh: async () => {},
    }),
  );
  expect(html).toContain('Record comparison');
  expect(html).toContain('AI similarity not run');
  expect(html).toContain('Run local semantic review');
  expect(html).toContain('Hold for clarification');
  expect(html).toContain('Mark reviewed');
  expect(html).toContain('Record pair disposition');
});
