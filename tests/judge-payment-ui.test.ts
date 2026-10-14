import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { PayPanel } from '../src/components/PayPanel';
import { demoRequest } from '../src/requests/schema';
test('judge payment controls stay disabled even if reviewed and provider configured', () => {
  const html = renderToStaticMarkup(
    createElement(PayPanel, {
      record: demoRequest,
      remote: {
        record: demoRequest,
        provenance: 'local',
        status: 'reviewed',
        reviewNote: 'test fixture',
      },
      configured: true,
      busy: false,
      financialActionsBlocked: true,
      act() {},
      async refresh() {},
    }),
  );
  expect(html).toContain('Judge mode · financial operations disabled');
  expect(html.match(/<button[^>]*disabled=""/g)).toHaveLength(3);
});
