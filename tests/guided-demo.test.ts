import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { GuidedDemo, PublicDemoIntro } from '../src/components/GuidedDemo';

test('public introduction leads with interactive access and honest resource boundaries', () => {
  const html = renderToStaticMarkup(
    createElement(PublicDemoIntro, { busy: false, online: true, onStart() {} }),
  );
  expect(html).toContain('Start Interactive Demo');
  expect(html).toContain('https://www.youtube.com/watch?v=G1qlgEfOQE8');
  expect(html).toContain('https://github.com/Ledgercorp/Waylatch');
  expect(html).toContain('No account or credentials needed');
  expect(html).toContain('AI runs on the server CPU');
  expect(html).toContain('after one hour');
  expect(html).toContain('documented false positives');
  expect(html).toContain('Financial actions blocked');
  expect(html).not.toContain('passphrase');
});

test('starting a fresh public session requires connection and avoids duplicate requests while busy', () => {
  for (const status of [
    { online: false, busy: false },
    { online: true, busy: true },
  ]) {
    const html = renderToStaticMarkup(createElement(PublicDemoIntro, { ...status, onStart() {} }));
    expect(html).toContain('disabled=""');
  }
});

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
