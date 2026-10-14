import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { GuidedDemo } from '../src/components/GuidedDemo';

test('judge guide separates fictional actions, human boundaries and historical payment', () => {
  const html = renderToStaticMarkup(
    createElement(GuidedDemo, {
      authenticated: false,
      busy: false,
      online: true,
      localCount: 0,
      onStart() {},
      onRequest() {},
      onHandoff() {},
      onReceive() {},
      onReview() {},
      onProof() {},
      onArchive() {},
    }),
  );
  expect(html).toContain('Start judge demo');
  expect(html).toContain('Reload to check preservation');
  expect(html).toContain('Historical payment evidence');
  expect(html).toContain('USD 1.00');
  expect(html).toContain('no new transaction');
  expect(html).toContain('Human REVIEW, AUTHORIZE and CAPTURE');
  expect(html).not.toContain('payment complete');
});

test('an active session does not claim that local preservation or AI has completed', () => {
  const html = renderToStaticMarkup(
    createElement(GuidedDemo, {
      authenticated: true,
      busy: false,
      online: false,
      localCount: 2,
      onStart() {},
      onRequest() {},
      onHandoff() {},
      onReceive() {},
      onReview() {},
      onProof() {},
      onArchive() {},
    }),
  );
  expect(html).toContain('2 local records on this device');
  expect(html).toContain('Offline now');
  expect(html).toContain('read the reported inference mode');
  expect(html).not.toContain('Start judge demo');
});
