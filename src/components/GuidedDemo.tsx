import { Archive, ArrowRight, RefreshCw, ScanLine, ShieldCheck } from 'lucide-react';
import type { ProofTrailInput } from '../proof/trail';

export type JudgeDemoInfo = {
  mode: 'judge';
  publicDemo?: boolean;
  sessionTtlSeconds?: number;
  evidenceOnly?: boolean;
  archive: ProofTrailInput & { readonly: true; historical: true; currentProviderInspection: false };
};
type Props = {
  authenticated: boolean;
  busy: boolean;
  online: boolean;
  localCount: number;
  evidenceOnly?: boolean;
  publicDemo?: boolean;
  onStart: () => void;
  onRequest: () => void;
  onHandoff: () => void;
  onReceive: () => void;
  onReview: () => void;
  onProof: () => void;
  onArchive: () => void;
};

export function PublicDemoIntro({
  busy,
  online,
  onStart,
}: {
  busy: boolean;
  online: boolean;
  onStart: () => void;
}) {
  return (
    <section className="public-demo-intro" aria-labelledby="demo-title">
      <p className="eyebrow">LEFTSOCK LABS / INTERACTIVE JUDGE EXPERIENCE</p>
      <h1 id="demo-title">Waylatch</h1>
      <h2>From field need to verified action.</h2>
      <p className="public-demo-description">
        Experience an offline-ready procurement workflow with QR handoff, local AI-assisted review,
        human financial controls and a verifiable Proof Trail.
      </p>
      <div className="public-demo-actions">
        <button className="primary" disabled={busy || !online} onClick={onStart}>
          {busy ? 'Starting your demo…' : 'Start Interactive Demo'}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <a
          className="secondary"
          href="https://www.youtube.com/watch?v=G1qlgEfOQE8"
          target="_blank"
          rel="noreferrer"
        >
          Watch the project video
        </a>
        <a
          className="text-button"
          href="https://github.com/Ledgercorp/Waylatch"
          target="_blank"
          rel="noreferrer"
        >
          View source code
        </a>
      </div>
      {!online && (
        <p className="notice" role="status">
          Reconnect to start a new demo session.
        </p>
      )}
      <div className="public-demo-facts">
        <div>
          <h3>Your fictional workspace</h3>
          <p>
            No account or credentials needed. Use fictional information only. Your server session
            expires after one hour; reset clears its records and this browser’s demo data.
          </p>
        </div>
        <div>
          <h3>Real workflow, human decisions</h3>
          <p>
            Browser records and QR handoff work offline after loading. AI runs on the server CPU and
            needs a connection. Similarity is advisory, with documented false positives.
          </p>
        </div>
        <div>
          <h3>Financial actions blocked</h3>
          <p>
            No orders, capture or payouts. Explore separately labeled historical Sandbox evidence
            without creating a transaction.
          </p>
        </div>
      </div>
    </section>
  );
}

export function GuidedDemo(props: Props) {
  return (
    <details
      id="judge-guide"
      className="judge-guide"
      open={props.publicDemo || !props.authenticated}
    >
      <summary>Guided judge demonstration · fictional records</summary>
      <div className="judge-guide-header">
        <div>
          <p className="eyebrow">GUIDED DEMONSTRATION / FICTIONAL REQUESTS</p>
          <h2>Keep a request moving. Keep authority human.</h2>
          <p className="muted">
            {props.publicDemo
              ? 'Your isolated fictional workspace lasts one hour. Keep browser records through refresh; reset starts fresh.'
              : 'Explore the existing product in an isolated local workspace.'}
          </p>
        </div>
        {!props.authenticated && (
          <button
            className="primary"
            disabled={props.busy || !props.online}
            onClick={props.onStart}
          >
            Start judge demo <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {props.evidenceOnly && (
        <p className="notice" role="status">
          Evidence-only mode: model setup is unavailable or intentionally skipped. Inspect the
          reported review mode; this walkthrough does not establish genuine AI inference.
        </p>
      )}
      <ol className="judge-steps">
        <li className="judge-step">
          <span className="eyebrow">01 / OFFLINE REQUEST</span>
          <h3>Preserve a fictional need</h3>
          <p>
            Open a request, disconnect the browser, then preserve it.{' '}
            {props.online ? 'Online now' : 'Offline now'} · {props.localCount} local records on this
            device.
          </p>
          <div className="judge-actions">
            <button className="secondary" onClick={props.onRequest}>
              New fictional request
            </button>
            <button className="text-button" onClick={() => location.reload()}>
              <RefreshCw size={14} aria-hidden="true" /> Reload to check preservation
            </button>
          </div>
        </li>
        <li className="judge-step">
          <span className="eyebrow">02 / QR HANDOFF</span>
          <h3>Carry packets across the gap</h3>
          <p>
            Copy or download packets from the selected request. Import them in the receiver. A
            second browser profile can act as a separate device.
          </p>
          <div className="judge-actions">
            <button className="secondary" onClick={props.onHandoff}>
              <ScanLine size={15} aria-hidden="true" /> Open QR handoff
            </button>
            <button className="text-button" onClick={props.onReceive}>
              Receive packets
            </button>
          </div>
        </li>
        <li className="judge-step">
          <span className="eyebrow">03 / LOCAL AI REVIEW</span>
          <h3>Compare evidence, then decide</h3>
          <p>
            Reconnect, submit the local request explicitly, and run review. Compare descriptions,
            receipts and context; read the reported inference mode. Similarity is advisory.
            {props.publicDemo &&
              ' AI runs on this server’s CPU, not offline inside your browser. The frozen evaluations did not establish improved duplicate detection or real-world effectiveness.'}
          </p>
          <button className="secondary" disabled={!props.authenticated} onClick={props.onReview}>
            Open coordinator review
          </button>
        </li>
        <li className="judge-step judge-boundary">
          <span className="eyebrow">04 / HUMAN AUTHORITY</span>
          <h3>Review never authorizes payment</h3>
          <p>
            Human REVIEW, AUTHORIZE and CAPTURE remain separate decisions. Judge mode allows review
            notes and pair dispositions; financial approvals and all provider operations are
            blocked.
          </p>
          <ShieldCheck size={22} aria-hidden="true" />
        </li>
        <li className="judge-step judge-archive">
          <span className="eyebrow">05 / ACTUAL SAVED SANDBOX PROOF</span>
          <h3>Historical payment evidence</h3>
          <p>
            View the previously completed USD 1.00 simulated purchase, its independent provider
            inspection and original seven-event chain. Read-only archive · no new transaction · USD
            0.00 real spending.
          </p>
          <button className="secondary" onClick={props.onArchive}>
            <Archive size={15} aria-hidden="true" /> View completed Sandbox Proof Trail
          </button>
        </li>
        <li className="judge-step">
          <span className="eyebrow">06 / PROOF TRAIL</span>
          <h3>See sources and evidence gaps</h3>
          <p>
            Open the selected fictional request’s timeline. Download a sanitized report, or export
            the complete original organization chain for independent SHA-256 validation.
          </p>
          <button className="secondary" onClick={props.onProof}>
            Open selected request’s Proof Trail
          </button>
        </li>
      </ol>
    </details>
  );
}
