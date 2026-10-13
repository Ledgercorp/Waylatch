import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { createApp } from '../server/app';
import { PayPalClient } from '../server/paypal';
import { paypalConfigFromEnv } from '../server/paypal-config';
import { Store } from '../server/store';
import { createWebhookGateway } from '../server/webhook-gateway';
import { validateChain } from '../src/audit/chain';

// Read-only provider inspection. Callback bodies below are deliberately synthetic;
// neither a new payment nor a webhook registration is created by this diagnostic.
const real = JSON.parse(readFileSync('docs/evidence/paypal-real-sandbox.json', 'utf8'));
const config = paypalConfigFromEnv();
const policy = JSON.parse(readFileSync('/etc/codex/network-policy.json', 'utf8'));
const evidence: Record<string, any> = {
  checkedAt: new Date().toISOString(),
  category: 'read-only-real-sandbox-webhook-release-diagnostic',
  orderId: real.orderId,
  captureId: real.captureId,
  configuredWebhookIdPresent: !!config.webhookId,
  fallbackSecretAliasSelected: !process.env.PAYPAL_CLIENT_SECRET && !!process.env.PAYPAL_SECRET_KEY,
  network: {
    policyVersion: policy.version,
    mode: policy.http_network_policy?.type,
    sandboxApiAllowed: policy.http_network_policy?.egress_rules?.some(
      (rule: any) => rule.host === new URL(PayPalClient.base).hostname,
    ),
    vpnConfigured: policy.vpn_configured,
    tcpDomainGrants: policy.tcp_network_access?.domains?.length,
    tcpIpRangeGrants: policy.tcp_network_access?.ip_ranges?.length,
    inheritedProxyPreserved: true,
  },
  providerRequests: [],
  financialMutationsExecuted: false,
  webhookRegistrationsChanged: false,
  realMoneyUsed: 0,
  genuineCallbackReceived: false,
  genuineSignatureVerified: false,
};

try {
  assert(config.clientId && config.clientSecret, 'Sandbox credentials unavailable');
  const oauth = await fetch(PayPalClient.base + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(20000),
  });
  evidence.oauthHttpStatus = oauth.status;
  assert(oauth.ok, 'Sandbox authentication failed');
  const token = z
    .object({ access_token: z.string().min(1) })
    .parse(await oauth.json()).access_token;
  const inspect = async (path: string) => {
    const response = await fetch(PayPalClient.base + path, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    const diagnostic: Record<string, unknown> = {
      method: 'GET',
      path,
      httpStatus: response.status,
    };
    evidence.providerRequests.push(diagnostic);
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      // Provider error codes only; omit messages, links, raw bodies and details values.
      const safeCode = (value: unknown) =>
        typeof value === 'string' && /^[A-Z0-9_]{1,100}$/.test(value) ? value : undefined;
      diagnostic.errorName = safeCode(error?.name);
      diagnostic.errorIssues = Array.isArray(error?.details)
        ? error.details.map((detail: any) => safeCode(detail.issue)).filter(Boolean)
        : [];
      return null;
    }
    return await response.json();
  };
  const registrations = await inspect('/v1/notifications/webhooks');
  if (registrations) {
    const webhooks = z
      .object({
        webhooks: z.array(z.object({ event_types: z.array(z.object({ name: z.string() })) })),
      })
      .parse(registrations).webhooks;
    evidence.registrations = {
      count: webhooks.length,
      subscribedEventTypes: [
        ...new Set(webhooks.flatMap((webhook) => webhook.event_types.map((event) => event.name))),
      ],
      callbackUrlsAndOtherApplicationsOmitted: true,
    };
  }
  const start = new Date(new Date(real.executedAt).getTime() - 5 * 60000)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z');
  const end = new Date(new Date(real.capturedAt).getTime() + 5 * 60000)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z');
  const query = new URLSearchParams({
    start_time: start,
    end_time: end,
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    page_size: '100',
  });
  const listing = await inspect('/v1/notifications/webhooks-events?' + query);
  if (listing) {
    const data = z
      .object({
        events: z.array(z.record(z.string(), z.unknown())).optional(),
        links: z.array(z.object({ rel: z.string() })).optional(),
      })
      .parse(listing);
    const events = data.events ?? [];
    const matched = events.filter(
      (event: any) =>
        event.resource?.id === real.captureId ||
        event.resource?.supplementary_data?.related_ids?.order_id === real.orderId,
    );
    evidence.captureEventListing = {
      startTime: start,
      endTime: end,
      eventTypeFilter: 'PAYMENT.CAPTURE.COMPLETED',
      returnedEvents: events.length,
      hasMorePages: !!data.links?.some((link) => link.rel === 'next'),
      matchingEvents: matched.map((event) => ({
        id: event.id,
        eventType: event.event_type,
        createTime: event.create_time,
        status: event.status,
      })),
      rawResourcesAndPayerDataOmitted: true,
      listingDoesNotProvideAuthenticTransmissionSignatureHeaders: true,
    };
  }
} catch {
  evidence.providerInspectionError = 'PROVIDER_REQUEST_OR_RESPONSE_FAILED';
  process.exitCode = 2;
}

const temporary = mkdtempSync(join(tmpdir(), 'waylatch-webhook-review-'));
let store: Store | undefined;
let server: Server | undefined;
try {
  copyFileSync(real.isolatedDatabase, join(temporary, 'isolated.sqlite'));
  store = new Store(join(temporary, 'isolated.sqlite'));
  const snapshot = () => {
    const data = JSON.stringify({
      records: store!.records(),
      payments: store!.payments(),
      events: store!.events(),
      webhooks: store!.db.prepare('SELECT * FROM webhooks ORDER BY id').all(),
    });
    return createHash('sha256').update(data).digest('hex');
  };
  const before = snapshot();
  const provider = new PayPalClient(config);
  const app = createApp({
    store,
    paypal: provider,
    password: 'local-diagnostic-no-session',
    origin: 'http://127.0.0.1:4173',
  });
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  const gateway = createWebhookGateway(`http://127.0.0.1:${address.port}`);
  const event = {
    id: 'synthetic-release-rejection-for-real-capture',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: real.captureId,
      supplementary_data: { related_ids: { order_id: real.orderId } },
    },
  };
  const unsigned = await request(app).post('/api/webhooks/paypal').send(event);
  assert.equal(unsigned.status, 400);
  const gatewayUnsigned = await request(gateway).post('/api/webhooks/paypal').send(event);
  assert.equal(gatewayUnsigned.status, 400);
  const checks: Record<string, unknown> = {
    unsignedBackendHttpStatus: unsigned.status,
    unsignedGatewayHttpStatus: gatewayUnsigned.status,
  };
  if (!config.webhookId) {
    const forged = await request(gateway)
      .post('/api/webhooks/paypal')
      .set({
        'paypal-transmission-id': 'synthetic-release-diagnostic',
        'paypal-transmission-time': new Date().toISOString(),
        'paypal-transmission-sig': 'synthetic-invalid-signature',
        'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/synthetic',
        'paypal-auth-algo': 'SHA256withRSA',
      })
      .send(event);
    assert.equal(forged.status, 400);
    checks.syntheticHeadersGatewayToRealBackendHttpStatus = forged.status;
    checks.reason =
      'PayPalClient fails closed without PAYPAL_WEBHOOK_ID; no verification API request or financial reconciliation occurs';
  }
  assert.equal(snapshot(), before);
  const payment = store.payment(real.recordId);
  assert.equal(payment?.state, 'PAID');
  assert.equal(payment?.orderId, real.orderId);
  assert.equal(payment?.captureId, real.captureId);
  const audit = validateChain(store.events());
  assert.equal(audit.valid, true);
  assert.equal(store.events().length, real.audit.events);
  evidence.localRejection = {
    ...checks,
    payloadCategory: 'synthetic callback referencing genuine completed Sandbox identifiers',
    providerImplementation: 'real PayPalClient; no provider double',
    originalDatabaseOpenedOrModified: false,
    copiedRecordsPaymentsAuditAndWebhookMarkersUnchanged: true,
    snapshotSha256Before: before,
    snapshotSha256After: snapshot(),
    paymentState: payment?.state,
    auditValid: audit.valid,
    auditEvents: store.events().length,
  };
} catch {
  evidence.localRejectionError = 'ISOLATED_CALLBACK_REJECTION_CHECK_FAILED';
  process.exitCode = 2;
} finally {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  store?.close();
  rmSync(temporary, { recursive: true, force: true });
}
writeFileSync(
  'docs/evidence/release-webhook-verification.json',
  JSON.stringify(evidence, null, 2) + '\n',
);
console.log(JSON.stringify(evidence, null, 2));
