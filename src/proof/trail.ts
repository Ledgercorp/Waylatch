import type { AuditEvent } from '../audit/chain';
import type { ImportProvenance, OutboxEntry } from '../offline/storage';
import type { ResourceRequest } from '../requests/schema';

export type ChainResult = { valid: boolean; count: number; brokenAt: number | null };
export type ArchivedProviderEvidence = {
  recordId: string;
  revision: number;
  amountCents: number;
  currency: string;
  orderId: string;
  captureId: string;
  environment: 'sandbox';
  verifiedAt: string;
  orderStatus: string;
  captureStatus: string;
  referenceMatched: boolean;
  singleFinalCaptureMatched: boolean;
  sourceFile: string;
  sourceSha256?: string;
  verificationFile?: string;
  verificationSha256?: string;
  captureCreatedAt?: string;
  auditCheckedAt?: string;
};
export type ProofPayment = {
  recordId: string;
  revision: number;
  amountCents: number;
  state: string;
  orderId: string | null;
  captureId: string | null;
};
export type ProofTrailInput = {
  record: ResourceRequest;
  provenance?: OutboxEntry | ImportProvenance;
  payment?: ProofPayment;
  events: AuditEvent[];
  chain?: ChainResult;
  providerEvidence?: ArchivedProviderEvidence;
};
export type ProofEntry = {
  id: string;
  at: string;
  kind: string;
  title: string;
  summary: string;
  source: 'request-metadata' | 'browser-local' | 'server-audit' | 'archived-provider';
  reference?: { seq?: number; hash?: string; file?: string; fileSha256?: string };
  details?: {
    revision?: number;
    orderId?: string;
    captureId?: string;
    amountCents?: number;
    mode?: string;
  };
};
export type ProofTrail = {
  recordId: string;
  revision: number;
  entries: ProofEntry[];
  gaps: string[];
  limitations: string[];
  chain: {
    status: 'not-checked' | 'verified' | 'failed' | 'scope-mismatch';
    count: number;
    brokenAt: number | null;
    summary: string;
  };
  transaction?: {
    amountCents: number;
    currency: string;
    orderId: string;
    captureId: string;
    environment: 'sandbox';
  };
};

const limitations = [
  'The request timeline combines self-declared request metadata, browser provenance and server audit references. These sources have different trust boundaries.',
  'Server validation is a reported result for the supplied organization chain. This browser view does not recompute SHA-256 event hashes.',
  'Hash links can detect changes against a known chain; an administrator can rewrite the entire database. No immutable-history claim.',
  'Sanitized summaries are not original event preimages. Their referenced hashes cannot independently validate this report.',
];

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function identifier(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : undefined;
}
function integer(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}
function hash(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
function time(value: unknown): string {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : '';
}
function evidenceFile(value: unknown): string | undefined {
  return typeof value === 'string' && /^docs\/evidence\/[a-z0-9-]+\.json$/.test(value)
    ? value
    : undefined;
}

/** Structural coverage only. This intentionally does not claim cryptographic validation. */
function completeScope(events: AuditEvent[], chain?: ChainResult): boolean {
  return (
    (!chain || chain.count === events.length) &&
    events.every(
      (event, index) =>
        event.seq === index + 1 &&
        event.previous === (index ? events[index - 1].hash : '0'.repeat(64)),
    )
  );
}

function chainSummary(input: ProofTrailInput): ProofTrail['chain'] {
  const { chain, events } = input;
  if (!chain)
    return {
      status: 'not-checked',
      count: events.length,
      brokenAt: null,
      summary: 'No server chain validation result supplied.',
    };
  if (!completeScope(events, chain))
    return {
      status: 'scope-mismatch',
      count: events.length,
      brokenAt: chain.brokenAt,
      summary:
        'Incomplete or mismatched chain scope. The reported validation does not establish this subset as a complete chain.',
    };
  return {
    status: chain.valid ? 'verified' : 'failed',
    count: chain.count,
    brokenAt: chain.brokenAt,
    summary: chain.valid
      ? `Server reported valid hash links for ${chain.count} organization events.`
      : `Server reported chain validation failure at event ${chain.brokenAt ?? 'unknown'}.`,
  };
}

function auditEntry(event: AuditEvent): ProofEntry {
  const data = object(event.data);
  const details: NonNullable<ProofEntry['details']> = {};
  const revision = integer(data.revision);
  const amountCents = integer(data.amountCents);
  const orderId = identifier(data.orderId);
  const captureId = identifier(data.captureId);
  if (revision !== undefined) details.revision = revision;
  if (amountCents !== undefined) details.amountCents = amountCents;
  if (orderId) details.orderId = orderId;
  if (captureId) details.captureId = captureId;
  let kind = 'additional-event';
  let title = 'Additional recorded event';
  let summary =
    'A server audit event exists. Its original payload is available only in the separate original chain export.';
  switch (event.type) {
    case 'request_created':
    case 'request_updated':
    case 'request_imported':
    case 'claim_submitted':
      kind = 'coordinator-submission';
      title =
        event.type === 'request_updated'
          ? 'Coordinator received a revision'
          : 'Coordinator received the request';
      summary =
        'The server persisted the submitted request. This event does not establish a prior offline session or QR handoff.';
      break;
    case 'risk_assessment_produced': {
      kind = 'risk-assessment';
      const semantic = data.mode === 'semantic-local';
      details.mode = semantic ? 'semantic-local' : 'deterministic-only';
      title = semantic
        ? 'Local AI risk assessment recorded'
        : 'Deterministic risk assessment recorded';
      summary = semantic
        ? 'Local semantic inference produced review indicators. AI did not authorize or execute a payment.'
        : 'Deterministic indicators were recorded; no semantic AI inference is established by this event.';
      break;
    }
    case 'human_review_completed':
      kind = 'human-review';
      title = 'Human review recorded';
      summary =
        data.disposition === 'clear'
          ? 'A human marked the request reviewed. Private review notes are excluded.'
          : 'A human held the request for clarification. Private review notes are excluded.';
      break;
    case 'purchase_approved':
    case 'reimbursement_approved':
      kind = 'human-approval';
      title =
        event.type === 'purchase_approved'
          ? 'Human purchase approval recorded'
          : 'Human reimbursement approval recorded';
      summary =
        'The server recorded an explicit human authorization for this revision. Approval alone does not establish a payment.';
      break;
    case 'order_attempt_reserved':
    case 'order_retry_reserved':
      kind = 'order-attempt';
      title = 'Order attempt reserved';
      summary =
        'The server reserved an attempt. Reservation does not establish provider order creation.';
      break;
    case 'paypal_order_created':
      kind = 'order-created';
      title = 'PayPal Sandbox order created';
      summary =
        'A Sandbox order reference was recorded. Order creation alone does not establish buyer approval or capture.';
      break;
    case 'buyer_approval_observed':
      kind = 'buyer-approval';
      title = 'Buyer approval observed';
      summary =
        'The server recorded buyer approval observed through authoritative order inspection.';
      break;
    case 'capture_completed':
      kind = 'capture-reconciliation';
      title = 'Capture completed and reconciled';
      summary =
        'Capture completion and reconciliation share the same recorded event and provider reference; no separate reconciliation event is asserted.';
      break;
    case 'capture_uncertain':
    case 'order_creation_uncertain':
    case 'capture_interruption_recovered':
    case 'order_interruption_recovered':
      kind = 'payment-uncertain';
      title = 'Payment outcome uncertain';
      summary =
        'The server recorded an interrupted or uncertain attempt. Completion is not established by this event.';
      break;
  }
  return {
    id: `audit-${event.seq}`,
    at: time(event.at),
    kind,
    title,
    summary,
    source: 'server-audit',
    reference: { seq: event.seq, hash: hash(event.hash) },
    ...(Object.keys(details).length ? { details } : {}),
  };
}

export function buildProofTrail(input: ProofTrailInput): ProofTrail {
  const { record, events, providerEvidence: provider } = input;
  const entries: ProofEntry[] = [
    {
      id: 'request-metadata',
      at: time(record.createdAt),
      kind: 'request-metadata',
      title: 'Request creation time declared',
      summary:
        'Creation time comes from the request payload. It does not independently prove when or where the request was preserved.',
      source: 'request-metadata',
      details: { revision: record.revision },
    },
  ];
  const gaps: string[] = [];
  const notes = [...limitations];
  let provenance: ImportProvenance | undefined;
  if (input.provenance && 'request' in input.provenance) {
    if (
      input.provenance.request.id === record.id &&
      input.provenance.request.revision === record.revision
    )
      provenance = input.provenance.provenance;
    else
      gaps.push(
        'Browser provenance belongs to a different request or revision and was not attached.',
      );
  } else provenance = input.provenance;
  if (provenance)
    entries.push({
      id: 'browser-provenance',
      at: time(provenance.recordedAt),
      kind: provenance.source === 'qr-import' ? 'qr-import' : 'local-preservation',
      title:
        provenance.source === 'qr-import'
          ? 'QR import preserved on this device'
          : 'Request preserved on this device',
      summary:
        provenance.source === 'qr-import'
          ? 'Browser provenance records an untrusted QR import. It establishes local preservation, without proving the sender or authorizing a payment.'
          : 'Browser provenance records local preservation. It does not establish that connectivity was unavailable.',
      source: 'browser-local',
    });
  entries.push(...events.filter((event) => event.recordId === record.id).map(auditEntry));
  const seen = (kind: string) => entries.some((entry) => entry.kind === kind);
  if (!provenance)
    gaps.push('No browser-local preservation evidence was supplied for this request.');
  if (!seen('qr-import'))
    gaps.push('No recorded QR import or handoff is established for this request.');
  if (!seen('coordinator-submission')) gaps.push('No coordinator submission event was supplied.');
  if (!seen('risk-assessment'))
    gaps.push('No AI risk assessment event was recorded for this request.');
  else if (
    !entries.some(
      (entry) => entry.kind === 'risk-assessment' && entry.details?.mode === 'semantic-local',
    )
  )
    gaps.push(
      'No semantic AI inference was established; the recorded assessment used deterministic indicators only.',
    );
  if (!seen('human-review')) gaps.push('No human review event was supplied.');
  if (!seen('human-approval')) gaps.push('No human approval event was supplied.');
  if (!seen('order-created')) gaps.push('No provider order creation event was supplied.');
  if (!seen('buyer-approval')) gaps.push('No buyer approval observation was supplied.');
  if (!seen('capture-reconciliation'))
    gaps.push('No completed capture/reconciliation event was supplied.');

  const trail: ProofTrail = {
    recordId: record.id,
    revision: record.revision,
    entries,
    gaps,
    limitations: notes,
    chain: chainSummary(input),
  };
  if (provider) {
    const references = entries.flatMap((entry) => (entry.details ? [entry.details] : []));
    const payment = input.payment;
    const matches =
      provider.recordId === record.id &&
      provider.revision === record.revision &&
      provider.currency === 'USD' &&
      provider.environment === 'sandbox' &&
      provider.amountCents === record.amountCents &&
      !!identifier(provider.orderId) &&
      !!identifier(provider.captureId) &&
      references.every(
        (reference) =>
          (!reference.orderId || reference.orderId === provider.orderId) &&
          (!reference.captureId || reference.captureId === provider.captureId),
      ) &&
      (!payment ||
        (payment.recordId === record.id &&
          payment.revision === record.revision &&
          payment.orderId === provider.orderId &&
          payment.captureId === provider.captureId));
    if (matches) {
      trail.transaction = {
        amountCents: provider.amountCents,
        currency: 'USD',
        orderId: provider.orderId,
        captureId: provider.captureId,
        environment: 'sandbox',
      };
      const completed =
        provider.orderStatus === 'COMPLETED' &&
        provider.captureStatus === 'COMPLETED' &&
        provider.referenceMatched &&
        provider.singleFinalCaptureMatched;
      entries.push({
        id: 'archived-provider-verification',
        at: time(provider.verifiedAt),
        kind: 'provider-verification',
        title: completed
          ? 'Archived provider inspection confirms completion'
          : 'Archived provider inspection supplied',
        summary: completed
          ? 'Saved read-only provider inspection matched the order, single final capture, approved reference and USD amount. This is historical evidence, with no live provider call.'
          : 'The archived inspection does not establish all required completion and reference checks.',
        source: 'archived-provider',
        reference: {
          file: evidenceFile(provider.verificationFile ?? provider.sourceFile),
          fileSha256: hash(
            provider.verificationFile ? provider.verificationSha256 : provider.sourceSha256,
          ),
        },
        details: {
          orderId: provider.orderId,
          captureId: provider.captureId,
          amountCents: provider.amountCents,
        },
      });
      notes.push(
        'This Sandbox transaction is historical archived evidence. Viewing or replaying this trail creates no new order or payment; simulated funds are not real spending.',
      );
    } else
      gaps.push(
        'Archived provider evidence belongs to a different request, revision, amount or payment reference and was not attached.',
      );
  } else gaps.push('No independent archived provider inspection was supplied.');
  entries.sort((a, b) => a.at.localeCompare(b.at));
  return trail;
}

/** Only the builder's allowlisted summaries and references enter this report. No raw payloads. */
export function exportSanitizedReport(trail: ProofTrail) {
  return {
    format: 'waylatch-proof-report-v1',
    scope: 'request-timeline',
    hashScope:
      'Sanitized summaries are not original event preimages; hashes are references to the separately exported original organization chain.',
    ...trail,
  };
}

/** Never filter or redact event preimages in an export intended for original-chain validation. */
export function exportOriginalChain(input: ProofTrailInput) {
  const completeFromGenesis = completeScope(input.events, input.chain);
  return {
    format: 'waylatch-original-audit-chain-v1',
    scope: 'organization-chain',
    requestTimelineRecordId: input.record.id,
    completeFromGenesis,
    chain: input.chain ? { ...input.chain } : null,
    validationScope:
      'Reported server result only. Independently validate original events with npm run audit:validate -- <export.json>.',
    limitations: [
      'Events retain their exact original payloads and hashes. They may contain private notes and organization records beyond the selected request.',
      'The request timeline is separate: filtering organization events by request can break sequence and previous-hash links.',
      ...(completeFromGenesis
        ? []
        : [
            'The supplied events are incomplete or differ from the reported validation scope; do not treat this export as a validated full chain.',
          ]),
      'Structural coverage is checked here; original cryptographic hashes are not recomputed in the browser.',
    ],
    events: structuredClone(input.events),
  };
}
