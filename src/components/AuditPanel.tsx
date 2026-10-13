import { ShieldCheck, Download } from 'lucide-react';
import type { AuditEvent } from '../audit/chain';
export function AuditPanel({
  events,
  chain,
  authenticated,
}: {
  events: AuditEvent[];
  chain?: { valid: boolean; count: number; brokenAt: number | null };
  authenticated: boolean;
}) {
  return (
    <section className="stage-content">
      <div className="section-heading">
        <div>
          <span className="eyebrow">04 / TAMPER-EVIDENT HISTORY</span>
          <h2>Follow the record. Verify the chain.</h2>
        </div>
        <ShieldCheck size={26} />
      </div>
      <p className="muted">
        Canonical JSON and SHA-256 link every recorded event. This detects changes against the
        chain; it cannot prevent an administrator rewriting the entire database. No
        immutable-history claim.
      </p>
      {!authenticated ? (
        <p className="notice">Sign in to inspect the organization’s persisted audit history.</p>
      ) : (
        <>
          <div className={chain?.valid ? 'chain-valid' : 'error'}>
            <ShieldCheck size={18} />
            <strong>
              {chain?.valid
                ? `Chain verified · ${chain.count} events`
                : `Chain validation failed at event ${chain?.brokenAt}`}
            </strong>
            <button
              className="text-button"
              onClick={() => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(
                  new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' }),
                );
                a.download = 'rescueledger-audit.json';
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              <Download size={16} />
              Export chain
            </button>
          </div>
          <ol className="audit-timeline">
            {events
              .slice()
              .reverse()
              .map((event) => (
                <li key={event.seq}>
                  <span className="audit-dot" />
                  <div>
                    <div className="event-title">
                      <strong>{event.type.replaceAll('_', ' ')}</strong>
                      <span className="mono">#{event.seq.toString().padStart(3, '0')}</span>
                    </div>
                    <p className="small">
                      {event.recordId ?? 'Organization event'} ·{' '}
                      {new Date(event.at).toLocaleString()}
                    </p>
                    <details>
                      <summary>Inspect event and hash</summary>
                      <p className="mono hash">SHA-256 {event.hash}</p>
                      <pre>{JSON.stringify(event.data, null, 2)}</pre>
                    </details>
                  </div>
                </li>
              ))}
          </ol>
          {events.length === 0 && (
            <p>
              No server events recorded yet. Local requests are preserved on this device until
              explicitly uploaded.
            </p>
          )}
        </>
      )}
    </section>
  );
}
