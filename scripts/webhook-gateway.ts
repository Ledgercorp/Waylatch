import { createWebhookGateway } from '../server/webhook-gateway';
const port = Number(process.env.WEBHOOK_GATEWAY_PORT ?? 4180);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid gateway port');
const app = createWebhookGateway(process.env.APP_ORIGIN ?? 'http://127.0.0.1:4173');
const server = app.listen(port, '127.0.0.1', () =>
  console.log(`Callback-only gateway listening on 127.0.0.1:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
