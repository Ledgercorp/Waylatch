import 'dotenv/config';
import express from 'express';
import { resolve } from 'node:path';
import { Store } from './store';
import { PayPalClient } from './paypal';
import { paypalConfigFromEnv } from './paypal-config';
import { createApp } from './app';
import { disposeModel } from '../src/risk/model';
const port = Number(process.env.PORT ?? 4173);
const origin = process.env.APP_ORIGIN ?? `http://127.0.0.1:${port}`;
const store = new Store(process.env.DATABASE_PATH ?? 'data/rescueledger.sqlite');
const app = createApp({
  store,
  paypal: new PayPalClient(paypalConfigFromEnv()),
  password: process.env.COORDINATOR_PASSWORD ?? '',
  origin,
});
app.use(
  express.static(resolve('dist'), {
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', path.endsWith('sw.js') ? 'no-cache' : 'public, max-age=300');
    },
  }),
);
app.get('/', (_req, res) => res.sendFile(resolve('dist/index.html')));
const server = app.listen(port, '127.0.0.1', () =>
  console.log(`Waylatch listening on ${origin}; PayPal Sandbox only`),
);
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () =>
    server.close(() => {
      store.close();
      void disposeModel().finally(() => process.exit(0));
    }),
  );
