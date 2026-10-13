/** Test-only separate-process HTTP simulator. No external network or real PayPal. */
import { createServer } from 'node:http';
let order: any = null;
let createKey = '';
let captureKey = '';
let approved = false;
let captured = false;
let dropCreate = false;
let dropCapture = false;
let orderCount = 0;
let captureCount = 0;
let calls: any[] = [];
function representation() {
  return {
    id: 'HTTP-SIM-ORDER',
    status: captured ? 'COMPLETED' : approved ? 'APPROVED' : 'CREATED',
    purchase_units: [
      {
        ...order.purchase_units[0],
        payments: captured
          ? {
              captures: [
                {
                  id: 'HTTP-SIM-CAPTURE',
                  status: 'COMPLETED',
                  final_capture: true,
                  amount: order.purchase_units[0].amount,
                },
              ],
            }
          : undefined,
      },
    ],
    links: [
      {
        rel: 'payer-action',
        href: 'https://www.sandbox.paypal.com/checkoutnow?token=HTTP-SIM-ORDER',
      },
    ],
  };
}
const server = createServer(async (req, res) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (raw.length > 50000) {
    res.writeHead(413).end();
    return;
  }
  let body: any;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }
  const send = (status: number, data: any) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  if (req.url === '/control') {
    approved = !!body.approved;
    dropCreate = !!body.dropCreate;
    dropCapture = !!body.dropCapture;
    send(200, { ok: true });
    return;
  }
  if (req.url === '/evidence') {
    send(200, { orderCount, captureCount, calls });
    return;
  }
  if (req.url === '/v1/oauth2/token') {
    if (
      req.headers.authorization !==
      'Basic ' + Buffer.from('sim-client:sim-secret').toString('base64')
    ) {
      send(401, { error: 'invalid_client' });
      return;
    }
    send(200, { access_token: 'sim-token', expires_in: 300 });
    return;
  }
  if (req.headers.authorization !== 'Bearer sim-token') {
    send(401, { error: 'unauthorized' });
    return;
  }
  calls.push({
    method: req.method,
    path: req.url,
    requestId: req.headers['paypal-request-id'] ?? null,
    body,
  });
  if (req.url === '/v2/checkout/orders' && req.method === 'POST') {
    const id = String(req.headers['paypal-request-id']);
    if (order && id !== createKey) {
      send(409, { error: 'duplicate_logical_purchase' });
      return;
    }
    if (!order) {
      order = body;
      createKey = id;
      orderCount++;
    }
    if (dropCreate) {
      dropCreate = false;
      req.socket.destroy();
      return;
    }
    send(201, representation());
    return;
  }
  if (req.url === '/v2/checkout/orders/HTTP-SIM-ORDER' && req.method === 'GET' && order) {
    send(200, representation());
    return;
  }
  if (req.url === '/v2/checkout/orders/HTTP-SIM-ORDER/capture' && req.method === 'POST' && order) {
    if (!approved) {
      send(422, { name: 'ORDER_NOT_APPROVED' });
      return;
    }
    if (captured && String(req.headers['paypal-request-id']) !== captureKey) {
      send(409, { error: 'duplicate_capture' });
      return;
    }
    if (!captured) {
      captureKey = String(req.headers['paypal-request-id']);
      captureCount++;
      captured = true;
    }
    if (dropCapture) {
      dropCapture = false;
      req.socket.destroy();
      return;
    }
    send(201, representation());
    return;
  }
  if (req.url === '/v1/notifications/verify-webhook-signature') {
    send(200, { verification_status: 'FAILURE' });
    return;
  }
  send(404, { error: 'unsupported_simulator_operation' });
});
server.listen(0, '127.0.0.1', () => process.send?.({ port: (server.address() as any).port }));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
