import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import { paypalConfigFromEnv } from '../server/paypal-config';
import { OrderSchema, PayPalClient } from '../server/paypal';

// Read-only independent provider inspection. Never create, capture or refund a payment.
const savedPath = 'docs/evidence/paypal-real-sandbox.json';
const savedBytes = readFileSync(savedPath);
const saved = z
  .object({
    recordId: z.string(),
    revision: z.number().int(),
    amountCents: z.number().int(),
    currency: z.literal('USD'),
    orderId: z.string().min(1),
    captureId: z.string().min(1),
    realMoneyUsed: z.literal(0),
    captureAuthorized: z.literal(true),
  })
  .parse(JSON.parse(savedBytes.toString('utf8')));
const config = paypalConfigFromEnv();
const evidence: Record<string, unknown> = {
  verifiedAt: new Date().toISOString(),
  category: 'independent-authorized-paypal-sandbox-transaction-verification',
  implementationCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  environment: 'sandbox',
  host: new URL(PayPalClient.base).hostname,
  savedEvidenceFile: savedPath,
  savedEvidenceSha256: createHash('sha256').update(savedBytes).digest('hex'),
  recordId: saved.recordId,
  revision: saved.revision,
  amountCents: saved.amountCents,
  currency: saved.currency,
  orderId: saved.orderId,
  captureId: saved.captureId,
  requests: [],
  independentlyVerified: false,
  financialMutationsExecuted: false,
  realMoneyUsed: 0,
};
class InspectionError extends Error {
  constructor(
    readonly code: string,
    readonly status: number | null = null,
  ) {
    super(code);
  }
}
try {
  if (!config.clientId || !config.clientSecret)
    throw new InspectionError('EXISTING_SANDBOX_CREDENTIALS_UNAVAILABLE');
  const auth = await fetch(PayPalClient.base + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(20000),
  });
  (evidence.requests as unknown[]).push({
    method: 'POST',
    path: '/v1/oauth2/token',
    httpStatus: auth.status,
    purpose: 'Read-only API inspection authentication',
  });
  if (!auth.ok) throw new InspectionError('SANDBOX_INSPECTION_AUTH_FAILED', auth.status);
  const { access_token: token } = z
    .object({ access_token: z.string().min(1) })
    .parse(await auth.json());
  async function inspect(path: string) {
    const response = await fetch(PayPalClient.base + path, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    (evidence.requests as unknown[]).push({ method: 'GET', path, httpStatus: response.status });
    if (!response.ok) throw new InspectionError('SANDBOX_INSPECTION_GET_FAILED', response.status);
    return response.json();
  }
  const order = OrderSchema.parse(
    await inspect('/v2/checkout/orders/' + encodeURIComponent(saved.orderId)),
  );
  const capture = z
    .object({
      id: z.string(),
      status: z.string(),
      amount: z.object({ currency_code: z.string(), value: z.string() }),
      final_capture: z.boolean().optional(),
      create_time: z.string().optional(),
      update_time: z.string().optional(),
      supplementary_data: z
        .object({ related_ids: z.object({ order_id: z.string().optional() }) })
        .optional(),
    })
    .parse(await inspect('/v2/payments/captures/' + encodeURIComponent(saved.captureId)));
  const expected = (saved.amountCents / 100).toFixed(2);
  const unit = order.purchase_units?.[0];
  const captures = unit?.payments?.captures;
  if (
    order.id !== saved.orderId ||
    order.status !== 'COMPLETED' ||
    order.purchase_units?.length !== 1 ||
    unit?.custom_id !== `${saved.recordId}:${saved.revision}` ||
    unit.amount?.currency_code !== 'USD' ||
    unit.amount.value !== expected ||
    captures?.length !== 1 ||
    captures[0].id !== saved.captureId ||
    captures[0].status !== 'COMPLETED' ||
    captures[0].amount.currency_code !== 'USD' ||
    captures[0].amount.value !== expected ||
    captures[0].final_capture !== true ||
    capture.id !== saved.captureId ||
    capture.status !== 'COMPLETED' ||
    capture.amount.currency_code !== 'USD' ||
    capture.amount.value !== expected ||
    (capture.supplementary_data?.related_ids.order_id &&
      capture.supplementary_data.related_ids.order_id !== saved.orderId)
  ) {
    throw new InspectionError('SAVED_TRANSACTION_DOES_NOT_MATCH_AUTHORITATIVE_PROVIDER');
  }
  Object.assign(evidence, {
    independentlyVerified: true,
    orderStatus: order.status,
    captureStatus: capture.status,
    authoritativeAmount: { currency: capture.amount.currency_code, value: capture.amount.value },
    referenceMatched: true,
    singleFinalCaptureMatched: true,
    captureCreatedAt: capture.create_time ?? null,
    captureUpdatedAt: capture.update_time ?? null,
  });
} catch (error) {
  evidence.failure =
    error instanceof InspectionError
      ? { code: error.code, httpStatus: error.status }
      : { code: 'TRANSPORT_OR_PROVIDER_RESPONSE_VALIDATION_FAILED' };
  process.exitCode = 2;
}
writeFileSync(
  'docs/evidence/paypal-independent-verification.json',
  JSON.stringify(evidence, null, 2) + '\n',
);
console.log(JSON.stringify(evidence));
