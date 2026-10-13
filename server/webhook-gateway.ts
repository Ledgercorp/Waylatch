import express from 'express';
// A tunnel targets this listener, never the coordinator server. No auth cookies are forwarded.
export function createWebhookGateway(upstreamOrigin: string) {
  const target = new URL(upstreamOrigin);
  if (
    target.protocol !== 'http:' ||
    target.hostname !== '127.0.0.1' ||
    !target.port ||
    target.username ||
    target.password ||
    target.pathname !== '/' ||
    target.search ||
    target.hash
  )
    throw new Error('Webhook upstream must be a loopback HTTP origin with an explicit port');
  const app = express();
  app.disable('x-powered-by');
  const names = [
    'paypal-transmission-id',
    'paypal-transmission-time',
    'paypal-transmission-sig',
    'paypal-cert-url',
    'paypal-auth-algo',
  ];
  app.use((req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (req.method !== 'POST' || req.originalUrl !== '/api/webhooks/paypal') {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (!req.is('application/json')) {
      res.status(415).json({ error: 'JSON callback required' });
      return;
    }
    if (
      names.some(
        (name) =>
          typeof req.headers[name] !== 'string' ||
          !req.headers[name]!.length ||
          req.headers[name]!.length > 4096,
      )
    ) {
      res.status(400).json({ error: 'Signature headers required' });
      return;
    }
    next();
  });
  app.use(express.raw({ type: 'application/json', limit: '48kb', inflate: false }));
  app.post('/api/webhooks/paypal', async (req, res) => {
    try {
      const headers = Object.fromEntries(names.map((name) => [name, req.headers[name] as string]));
      const response = await fetch(new URL('/api/webhooks/paypal', target), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: req.body,
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      });
      // Verification and deduplication still belong to the existing backend.
      if (response.status === 200) {
        const data = await response.json();
        if (data.verified === true) res.json({ verified: true });
        else if (data.duplicate === true) res.json({ duplicate: true });
        else res.status(502).json({ error: 'Callback verification unavailable' });
      } else {
        res
          .status([400, 413, 503].includes(response.status) ? response.status : 502)
          .json({ error: 'Callback rejected or unavailable' });
      }
    } catch {
      res.status(503).json({ error: 'Callback verification unavailable; retry later' });
    }
  });
  app.use(
    (error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(error?.status === 413 ? 413 : 400).json({ error: 'Invalid callback body' });
    },
  );
  return app;
}
