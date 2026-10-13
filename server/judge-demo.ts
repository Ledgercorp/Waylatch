import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { demoRequest, RequestSchema, type ResourceRequest } from '../src/requests/schema';
import { validateChain } from '../src/audit/chain';
import { Store } from './store';

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const id = z.string().min(1).max(100);
const integer = z.number().int().positive();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const eventData = {
  request_created: z.object({
    revision: integer,
    provenance: z.literal('local'),
    record: RequestSchema,
  }),
  human_review_completed: z.object({
    revision: integer,
    disposition: z.literal('clear'),
    note: z.string().max(1000),
  }),
  purchase_approved: z.object({
    revision: integer,
    amountCents: integer,
    confirmation: z.literal(true),
  }),
  order_attempt_reserved: z.object({ revision: integer, amountCents: integer }),
  paypal_order_created: z.object({
    orderId: id,
    revision: integer,
    amountCents: integer,
    environment: z.literal('sandbox'),
  }),
  buyer_approval_observed: z.object({
    orderId: id,
    source: z.literal('authoritative_order_inspection'),
  }),
  capture_completed: z.object({
    orderId: id,
    captureId: id,
    amountCents: integer,
    environment: z.literal('sandbox'),
    source: z.literal('order_inspection'),
  }),
};

/** Read whitelisted saved evidence only. Never opens a historical database or contacts PayPal. */
export function loadJudgeArchive(root = process.cwd()) {
  const read = (file: string) => {
    const bytes = readFileSync(resolve(root, file));
    return {
      value: JSON.parse(bytes.toString('utf8')) as unknown,
      sourceFile: file,
      sourceSha256: sha256(bytes),
    };
  };
  const saved = read('docs/evidence/paypal-real-sandbox.json');
  const payment = z
    .object({
      recordId: id,
      revision: integer,
      amountCents: z.literal(100),
      currency: z.literal('USD'),
      orderId: id,
      captureId: id,
      paymentState: z.literal('PAID'),
      realMoneyUsed: z.literal(0),
    })
    .parse(saved.value);
  const verification = read('docs/evidence/paypal-independent-verification.json');
  const provider = z
    .object({
      recordId: id,
      revision: integer,
      amountCents: z.literal(100),
      currency: z.literal('USD'),
      orderId: id,
      captureId: id,
      environment: z.literal('sandbox'),
      verifiedAt: z.iso.datetime(),
      orderStatus: z.literal('COMPLETED'),
      captureStatus: z.literal('COMPLETED'),
      independentlyVerified: z.literal(true),
      referenceMatched: z.literal(true),
      singleFinalCaptureMatched: z.literal(true),
      savedEvidenceFile: z.literal(saved.sourceFile),
      savedEvidenceSha256: digest,
      captureCreatedAt: z.iso.datetime().optional(),
    })
    .parse(verification.value);
  if (
    provider.savedEvidenceSha256 !== saved.sourceSha256 ||
    ['recordId', 'revision', 'orderId', 'captureId', 'amountCents', 'currency'].some(
      (key) => provider[key as keyof typeof provider] !== payment[key as keyof typeof payment],
    )
  )
    throw new Error('Historical provider evidence does not match its saved source');
  const audit = read('docs/evidence/paypal-sandbox-audit.json');
  const envelope = z
    .object({
      recordId: id,
      events: z
        .array(
          z.object({
            seq: integer,
            at: z.iso.datetime(),
            type: z.enum(
              Object.keys(eventData) as [keyof typeof eventData, ...(keyof typeof eventData)[]],
            ),
            recordId: id,
            data: z.unknown(),
            previous: digest,
            hash: digest,
          }),
        )
        .length(7),
    })
    .parse(audit.value);
  const events = envelope.events.map((event) => ({
    ...event,
    data: eventData[event.type].parse(event.data),
  }));
  const chain = validateChain(events);
  if (
    !chain.valid ||
    envelope.recordId !== payment.recordId ||
    events.some((event) => event.recordId !== payment.recordId)
  )
    throw new Error('Historical audit integrity check failed');
  const record = RequestSchema.parse((events[0].data as { record?: unknown }).record);
  const last = events[6].data as { orderId?: string; captureId?: string; amountCents?: number };
  if (
    record.id !== payment.recordId ||
    record.revision !== payment.revision ||
    record.amountCents !== payment.amountCents ||
    last.orderId !== payment.orderId ||
    last.captureId !== payment.captureId ||
    last.amountCents !== payment.amountCents
  )
    throw new Error('Historical audit references do not match saved payment');
  const validation = read('docs/evidence/paypal-sandbox-audit-validation.json');
  const checked = z
    .object({
      checkedAt: z.iso.datetime(),
      recordId: z.literal(payment.recordId),
      valid: z.literal(true),
      count: z.literal(7),
      persistedEventsMatchExport: z.literal(true),
      captureReferencesMatch: z.literal(true),
    })
    .parse(validation.value);
  return {
    readonly: true as const,
    historical: true as const,
    currentProviderInspection: false as const,
    record,
    payment: { ...payment, state: payment.paymentState, environment: 'sandbox' as const },
    events,
    chain,
    sourceFile: audit.sourceFile,
    sourceSha256: audit.sourceSha256,
    providerEvidence: {
      recordId: provider.recordId,
      revision: provider.revision,
      amountCents: provider.amountCents,
      currency: provider.currency,
      orderId: provider.orderId,
      captureId: provider.captureId,
      environment: provider.environment,
      verifiedAt: provider.verifiedAt,
      orderStatus: provider.orderStatus,
      captureStatus: provider.captureStatus,
      referenceMatched: provider.referenceMatched,
      singleFinalCaptureMatched: provider.singleFinalCaptureMatched,
      sourceFile: saved.sourceFile,
      sourceSha256: saved.sourceSha256,
      verificationFile: verification.sourceFile,
      verificationSha256: verification.sourceSha256,
      captureCreatedAt: provider.captureCreatedAt,
      auditCheckedAt: checked.checkedAt,
    },
  };
}
export type JudgeArchive = ReturnType<typeof loadJudgeArchive>;
export function judgeDemoMetadata(archive: JudgeArchive) {
  return {
    mode: 'judge' as const,
    fictional: true as const,
    financialMutationsAllowed: false as const,
    providerCallsAllowed: false as const,
    guide: [
      'Open Compare and run the real local AI on the fictional requests.',
      'Inspect each candidate and record related, unrelated, or investigate with a human note.',
      'Open Proof Trail to verify the saved historical USD 1.00 Sandbox transaction and genuine seven-event chain.',
      'Fictional review and historical evidence stay separate. Purchases, captures and financial approvals are blocked.',
    ],
    archive,
  };
}
export function newJudgePassphrase() {
  return randomBytes(48).toString('base64url');
}
export function clearPayPalEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  for (const key of [
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'PAYPAL_SECRET_KEY',
    'PAYPAL_WEBHOOK_ID',
  ])
    delete environment[key];
}
export function isLoopbackHost(host: string | undefined) {
  if (!host) return false;
  try {
    return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

/** Separate demonstration examples; never imports the held-out evaluation corpus. */
export function createJudgeRuntime(directory: string) {
  const archive = loadJudgeArchive();
  const password = newJudgePassphrase();
  const store = new Store(join(directory, 'judge.sqlite'));
  const make = (
    id: string,
    text: string,
    changes: Partial<ResourceRequest> = {},
  ): ResourceRequest =>
    RequestSchema.parse({
      ...demoRequest,
      id,
      origin: 'Judge field team · fictional',
      resources: [{ description: text, quantity: 24 }],
      ...changes,
    });
  const records = [
    make('RL-JUDGE-WATER-A', 'Bottled drinking water for Ember shelter'),
    make('RL-JUDGE-WATER-B', 'Emergency potable water bottles for people at Ember shelter', {
      createdAt: '2026-10-13T08:05:00.000Z',
    }),
    make('RL-JUDGE-WATER-C', 'Bottled drinking water for the east evacuation site', {
      location: 'East evacuation site · fictional',
      createdAt: '2026-10-13T08:10:00.000Z',
    }),
    make('RL-JUDGE-RADIOS', 'Replacement batteries for emergency communication radios'),
    make('RL-JUDGE-OTHER', 'Bottled drinking water for Ember shelter', {
      incident: 'WILDFIRE-PINE-26',
      location: 'Pine fire shelter · fictional',
    }),
    make('RL-JUDGE-CLAIM-A', 'Receipted water purchase for Ember shelter', {
      kind: 'claim',
      receiptDigest: 'c'.repeat(64),
      expenseAt: '2026-10-13T07:00:00.000Z',
      transactionReference: 'FICTIONAL-RECEIPT-01',
    }),
    make('RL-JUDGE-CLAIM-B', 'Drinking water expenses for shelter', {
      kind: 'claim',
      receiptDigest: 'c'.repeat(64),
      expenseAt: '2026-10-13T07:00:00.000Z',
      transactionReference: 'FICTIONAL-RECEIPT-01',
    }),
  ];
  try {
    store.atomic(() => {
      for (const record of records) {
        store.putRecord({ record, provenance: 'local', status: 'pending', reviewNote: null });
        store.append(record.kind === 'claim' ? 'claim_submitted' : 'request_created', record.id, {
          revision: record.revision,
          provenance: 'local',
          fictional: true,
          record,
        });
      }
    });
    return { store, password, archive };
  } catch (error) {
    store.close();
    throw error;
  }
}
