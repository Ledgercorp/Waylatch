import { Archive, Download, FileCheck2, Fingerprint, ShieldCheck } from 'lucide-react';
import {
  buildProofTrail,
  exportOriginalChain,
  exportSanitizedReport,
  type ProofEntry,
  type ProofTrailInput,
} from '../proof/trail';

const sourceLabels: Record<ProofEntry['source'], string> = {
  'request-metadata': 'Request metadata',
  'browser-local': 'Browser local',
  'server-audit': 'Organization audit',
  'archived-provider': 'Archived provider',
};

function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function EventCard({ entry }: { entry: ProofEntry }) {
  return (
    <li className={`proof-event proof-event--${entry.source}`}>
      <span className="proof-event-dot" aria-hidden="true" />
      <article className="proof-event-card">
        <div className="proof-event-meta">
          <span className={`proof-source proof-source--${entry.source}`}>
            {sourceLabels[entry.source]}
          </span>
          {entry.at ? (
            <time className="small mono" dateTime={entry.at}>
              {new Date(entry.at).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'medium',
              })}
            </time>
          ) : (
            <span className="small">Timestamp not established</span>
          )}
        </div>
        <h3>{entry.title}</h3>
        <p>{entry.summary}</p>
        {entry.details && (
          <dl className="proof-event-details">
            {entry.details.revision !== undefined && (
              <div>
                <dt>Revision</dt>
                <dd>{entry.details.revision}</dd>
              </div>
            )}
            {entry.details.amountCents !== undefined && (
              <div>
                <dt>Amount</dt>
                <dd>USD {(entry.details.amountCents / 100).toFixed(2)}</dd>
              </div>
            )}
            {entry.details.orderId && (
              <div>
                <dt>Order</dt>
                <dd className="mono">{entry.details.orderId}</dd>
              </div>
            )}
            {entry.details.captureId && (
              <div>
                <dt>Capture</dt>
                <dd className="mono">{entry.details.captureId}</dd>
              </div>
            )}
          </dl>
        )}
        {entry.reference && (
          <details className="proof-reference">
            <summary>
              <Fingerprint size={14} aria-hidden="true" /> Evidence reference
            </summary>
            {entry.reference.seq !== undefined && (
              <p className="small">Original organization event #{entry.reference.seq}</p>
            )}
            {entry.reference.hash && (
              <p className="mono hash">Event SHA-256 {entry.reference.hash}</p>
            )}
            {entry.reference.file && <p className="mono proof-file">{entry.reference.file}</p>}
            {entry.reference.fileSha256 && (
              <p className="mono hash">File SHA-256 {entry.reference.fileSha256}</p>
            )}
            <p className="small">
              This summary is sanitized. A referenced event hash applies to its original payload,
              not to this card.
            </p>
          </details>
        )}
      </article>
    </li>
  );
}

/** Read-only presentation: exports are local downloads; this component makes no API calls. */
export function ProofTrail(props: ProofTrailInput) {
  const trail = buildProofTrail(props);
  const original = exportOriginalChain(props);
  return (
    <section className="stage-content proof-trail" aria-label="Proof Trail">
      <div className="section-heading">
        <div>
          <span className="eyebrow">04 / PROOF TRAIL</span>
          <h2>From request to a verifiable record.</h2>
        </div>
        <FileCheck2 size={27} aria-hidden="true" />
      </div>
      <p className="muted">
        Follow the evidence across the device, coordinator and provider. Each step names its source;
        missing evidence stays visible.
      </p>
      <div className="proof-record-heading">
        <strong className="mono">{trail.recordId}</strong>
        <span className="small">Revision {trail.revision} · chronological request timeline</span>
      </div>

      {trail.transaction && (
        <div className="proof-archive-banner">
          <Archive size={22} aria-hidden="true" />
          <div>
            <strong>Historical Sandbox evidence</strong>
            <p>
              Saved USD {(trail.transaction.amountCents / 100).toFixed(2)} simulated transaction.
              Viewing this trail creates no new payment.
            </p>
            <dl className="proof-transaction">
              <div>
                <dt>Order</dt>
                <dd className="mono">{trail.transaction.orderId}</dd>
              </div>
              <div>
                <dt>Capture</dt>
                <dd className="mono">{trail.transaction.captureId}</dd>
              </div>
              <div>
                <dt>Real spending</dt>
                <dd>USD 0.00</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      <div className={`proof-validation proof-validation--${trail.chain.status}`}>
        <ShieldCheck size={21} aria-hidden="true" />
        <div>
          <strong>Audit validation result</strong>
          <p>{trail.chain.summary}</p>
          <span className="small">
            Organization chain scope · {props.events.length} original events supplied ·{' '}
            {trail.entries.filter((entry) => entry.source === 'server-audit').length} shown for this
            request
          </span>
          {trail.transaction && props.providerEvidence?.auditCheckedAt && (
            <p className="small">
              Archived audit check:{' '}
              {new Date(props.providerEvidence.auditCheckedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="proof-layout">
        <div className="proof-timeline-column">
          <ol className="proof-timeline" aria-label="Chronological evidence">
            {trail.entries.map((entry) => (
              <EventCard key={entry.id} entry={entry} />
            ))}
          </ol>
        </div>
        <aside className="proof-sidebar" aria-label="Evidence scope and exports">
          <div className="proof-side-card">
            <span className="eyebrow">SOURCE BOUNDARIES</span>
            <h3>Where proof comes from</h3>
            <ul className="proof-legend">
              <li>
                <span className="proof-source proof-source--request-metadata">
                  Request metadata
                </span>
                <p>Self-declared creation time.</p>
              </li>
              <li>
                <span className="proof-source proof-source--browser-local">Browser local</span>
                <p>Preservation or QR import on this device.</p>
              </li>
              <li>
                <span className="proof-source proof-source--server-audit">Organization audit</span>
                <p>Recorded coordinator and payment events.</p>
              </li>
              <li>
                <span className="proof-source proof-source--archived-provider">
                  Archived provider
                </span>
                <p>Saved independent inspection, with no live call.</p>
              </li>
            </ul>
          </div>
          <details className="proof-side-card proof-gaps" open>
            <summary>
              Evidence gaps <span className="proof-gap-count">{trail.gaps.length}</span>
            </summary>
            <ul>
              {trail.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </details>
          <div className="proof-side-card proof-exports">
            <h3>Take the evidence with you</h3>
            <p className="small">
              The sanitized report excludes private payloads. Original hashes remain evidence
              references.
            </p>
            <button
              className="secondary"
              onClick={() =>
                download(exportSanitizedReport(trail), `waylatch-proof-${trail.recordId}.json`)
              }
            >
              <Download size={16} aria-hidden="true" /> Export sanitized report
            </button>
            <details className="proof-original-export">
              <summary>Original chain for independent validation</summary>
              <p className="small">
                Includes original organization events and may contain private notes or other
                requests. Filtering or redacting these payloads can break their original hashes.
              </p>
              {!original.completeFromGenesis && (
                <p className="small">
                  The supplied events are incomplete. The export retains that scope warning.
                </p>
              )}
              <button
                className="text-button"
                disabled={props.events.length === 0}
                onClick={() =>
                  download(exportOriginalChain(props), 'waylatch-original-organization-chain.json')
                }
              >
                <Download size={15} aria-hidden="true" /> Export original organization chain
              </button>
              <p className="small mono proof-file">npm run audit:validate -- &lt;export.json&gt;</p>
            </details>
          </div>
        </aside>
      </div>
      <details className="proof-limitations">
        <summary>Verification scope &amp; limitations</summary>
        <ul>
          {trail.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
