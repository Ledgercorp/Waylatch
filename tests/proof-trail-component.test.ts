import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { ProofTrail } from '../src/components/ProofTrail';
import { demoRequest } from '../src/requests/schema';

const archive = JSON.parse(readFileSync('docs/evidence/paypal-sandbox-audit.json', 'utf8'));
const provider = JSON.parse(
  readFileSync('docs/evidence/paypal-independent-verification.json', 'utf8'),
);

test('a request without events visibly explains evidence gaps and missing validation', () => {
  const html = renderToStaticMarkup(createElement(ProofTrail, { record: demoRequest, events: [] }));
  expect(html).toContain('Proof Trail');
  expect(html).toContain('No server chain validation result supplied');
  expect(html).toContain('Evidence gaps');
  expect(html).toContain('No human approval event');
  expect(html).toContain('Export sanitized report');
  expect(html).toContain('disabled=""');
});

test('the historical view identifies sources, exact references and full-chain export scope', () => {
  const html = renderToStaticMarkup(
    createElement(ProofTrail, {
      record: archive.events[0].data.record,
      events: archive.events,
      chain: archive.chain,
      providerEvidence: {
        ...provider,
        sourceFile: 'docs/evidence/paypal-real-sandbox.json',
        verificationFile: 'docs/evidence/paypal-independent-verification.json',
      },
    }),
  );
  expect(html).toContain('Historical Sandbox evidence');
  expect(html).toContain('USD 1.00');
  expect(html).toContain('2W330508JA572391V');
  expect(html).toContain('8WY07860808872629');
  expect(html).toContain('Archived provider');
  expect(html).toContain('Organization audit');
  expect(html).toContain('Export original organization chain');
  expect(html).toContain('private notes');
  expect(html).not.toContain('Human operator explicitly replied');
});
