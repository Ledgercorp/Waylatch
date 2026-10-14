import express from 'express';
import { resolve } from 'node:path';
import { createPublicJudge } from '../server/public-judge';
import { clearPayPalEnvironment } from '../server/judge-demo';
import {
  disposeModel,
  embedTexts,
  MODEL_ID,
  MODEL_REVISION,
  modelMetrics,
} from '../src/risk/model';

// No dotenv, existing database, merchant configuration or PayPal client in this entry point.
clearPayPalEnvironment();
const origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
if (!origin) throw new Error('APP_ORIGIN or RENDER_EXTERNAL_URL is required');
const port = Number(process.env.PORT || 10000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const runtime = createPublicJudge({ origin, renderEdge: process.env.RENDER === 'true' });
let modelMode = 'deterministic-only';
try {
  await embedTexts(['Fictional drinking water for a shelter']);
  modelMode = 'semantic-local';
} catch {
  console.warn('Pinned local model unavailable; review will report deterministic-only fallback.');
}
runtime.app.use(
  express.static(resolve('dist'), {
    setHeaders: (res, path) =>
      res.set('Cache-Control', path.endsWith('sw.js') ? 'no-cache' : 'public, max-age=300'),
  }),
);
runtime.app.get('/', (_req, res) => res.sendFile(resolve('dist/index.html')));
const server = runtime.app.listen(port, '0.0.0.0', () =>
  console.log(
    JSON.stringify({
      mode: 'public-judge',
      origin,
      modelMode,
      model: MODEL_ID,
      revision: MODEL_REVISION,
      loadMilliseconds: modelMetrics.loadMilliseconds,
      rssBytes: process.memoryUsage().rss,
      financialProviderCallsAllowed: false,
    }),
  ),
);
server.requestTimeout = 60000;
server.headersTimeout = 15000;
server.keepAliveTimeout = 5000;
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(() => {
      void disposeModel().finally(() => {
        runtime.close();
        process.exit(0);
      });
    });
  });
