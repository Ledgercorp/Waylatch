import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Radio,
  ScanLine,
  Plus,
  ChevronRight,
  Wifi,
  WifiOff,
  CheckCircle,
  ArrowRight,
  LifeBuoy,
  Lock,
  LogOut,
  Package,
} from 'lucide-react';
import { demoRequest, unknownFields, type ResourceRequest } from '../requests/schema';
import { getOutbox, saveRequest, type OutboxEntry } from '../offline';
import type { StoredRecord, Payment } from '../../server/store';
import type { AuditEvent } from '../audit/chain';
import { api, money } from './api';
import { RequestForm } from './RequestForm';
import { Handoff, Receiver } from './Handoff';
import { Dialog } from './Dialog';
import { ReviewPanel } from './ReviewPanel';
import { PayPanel } from './PayPanel';
import { AuditPanel } from './AuditPanel';
const stages = ['Request', 'Review', 'Pay', 'Audit'] as const;
type Stage = (typeof stages)[number];
type State = {
  records: StoredRecord[];
  payments: Payment[];
  events: AuditEvent[];
  chain: { valid: boolean; count: number; brokenAt: number | null };
};
const duplicate: ResourceRequest = {
  ...demoRequest,
  id: 'RL-DEMO02',
  resources: [
    { description: 'Drinking water bottles for displaced families at Ember shelter', quantity: 24 },
  ],
  origin: 'Coordinator Echo · fictional',
  createdAt: '2026-10-13T08:15:00.000Z',
};
const claim: ResourceRequest = {
  ...demoRequest,
  id: 'RL-CLAIM01',
  kind: 'claim',
  resources: [{ description: 'Water bottles purchased for the Ember flood shelter', quantity: 24 }],
  receiptDigest: 'a'.repeat(64),
  expenseAt: '2026-10-12T17:30:00.000Z',
  createdAt: '2026-10-13T08:20:00.000Z',
  origin: 'Fictional volunteer Quinn',
};
export function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const [stage, setStage] = useState<Stage>(
    new URLSearchParams(location.search).has('paypal') ? 'Pay' : 'Request',
  );
  const [outbox, setOutbox] = useState<OutboxEntry[]>([]);
  const [selected, setSelected] = useState(
    new URLSearchParams(location.search).get('record') ?? demoRequest.id,
  );
  const [state, setState] = useState<State>({
    records: [],
    payments: [],
    events: [],
    chain: { valid: true, count: 0, brokenAt: null },
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [dialog, setDialog] = useState<'form' | 'handoff' | 'receive' | 'login' | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const localRecords = outbox.map((x) => x.request);
  const records = [
    ...localRecords,
    ...state.records.map((x) => x.record).filter((r) => !localRecords.some((x) => x.id === r.id)),
  ];
  const displayed = records.length ? records : [demoRequest];
  const record = displayed.find((r) => r.id === selected) ?? displayed[0];
  const remote = state.records.find((x) => x.record.id === record.id);
  const payment = state.payments.find((p) => p.recordId === record.id);
  const provenance = outbox.find((x) => x.request.id === record.id)?.provenance;
  async function refresh() {
    setState(await api<State>('/state'));
    setAuthenticated(true);
  }
  async function loadLocal() {
    setOutbox(await getOutbox());
  }
  useEffect(() => {
    loadLocal().catch((e) => setError(e.message));
    api<{ paypalConfigured: boolean }>('/health')
      .then((r) => setConfigured(r.paypalConfigured))
      .catch(() => {});
    refresh().catch(() => setAuthenticated(false));
    const changed = () => setOnline(navigator.onLine);
    window.addEventListener('online', changed);
    window.addEventListener('offline', changed);
    return () => {
      window.removeEventListener('online', changed);
      window.removeEventListener('offline', changed);
    };
  }, []);
  function act(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    void fn()
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }
  async function preserve(r: ResourceRequest, source: 'local' | 'qr-import' = 'local') {
    await saveRequest(r, source);
    await loadLocal();
    setSelected(r.id);
    setStage('Request');
    setNotice(
      source === 'qr-import'
        ? 'QR request preserved. Human review required.'
        : 'Request preserved on this device.',
    );
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to command workspace
      </a>
      <header className="site-header">
        <a href="/" className="brand" aria-label="Waylatch home">
          <span className="brand-mark">
            <LifeBuoy size={24} />
          </span>
          <span>
            Way<span className="brand-ledger">latch</span>
          </span>
        </a>
        <span className="header-caption">LEFTSOCK LABS / FIELD OPERATIONS</span>
        <div className="header-actions">
          <span className="sandbox-label">
            <Lock size={12} />
            SANDBOX ONLY
          </span>
          {authenticated ? (
            <button
              className="header-button"
              onClick={() =>
                act(async () => {
                  await api('/session', undefined, 'DELETE');
                  setAuthenticated(false);
                  setState({
                    records: [],
                    payments: [],
                    events: [],
                    chain: { valid: true, count: 0, brokenAt: null },
                  });
                })
              }
            >
              <LogOut size={15} />
              Sign out
            </button>
          ) : (
            <button className="header-button" onClick={() => setDialog('login')}>
              Coordinator sign in
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </header>
      <div className={online ? 'connectivity online' : 'connectivity offline'} role="status">
        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
        <strong>
          {online ? 'ONLINE · local preservation ready' : 'OFFLINE · requests stay on this device'}
        </strong>
        <span>
          {online
            ? 'Transfer to review is always explicit.'
            : 'QR handoff remains available. Reconnection never sends money.'}
        </span>
      </div>
      <main id="main">
        <section className="hero">
          <div>
            <p className="eyebrow">EMERGENCY PROCUREMENT / CONTINUITY BY DESIGN</p>
            <h1>
              From field need
              <br />
              <span>to verified action.</span>
            </h1>
            <p className="hero-description">
              Keep urgent supply requests moving through a network failure.
              <br className="desktop-br" /> Reconnect with evidence, human authorization and PayPal.
            </p>
          </div>
          <div
            className="incident-map"
            aria-label="Schematic of fictional Ember flood-response incident"
          >
            <svg viewBox="0 0 310 160" aria-hidden="true">
              <defs>
                <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="currentColor" strokeWidth=".5" />
                </pattern>
              </defs>
              <rect width="310" height="160" fill="url(#grid)" />
              <path
                d="M70 -10 C100 45,210 10,175 85 S240 105,280 175"
                stroke="#aec5c6"
                strokeWidth="17"
                fill="none"
              />
              <path
                d="M0 130 L85 110 L120 140 L185 120 L260 60 L310 80 M25 0 L45 55 L120 50 L150 0"
                stroke="#9daea9"
                strokeWidth="1"
                fill="none"
              />
              <circle
                cx="108"
                cy="85"
                r="24"
                fill="#c9654120"
                stroke="#ba5837"
                strokeDasharray="3 4"
              />
              <circle cx="108" cy="85" r="5" fill="#b85231" />
              <path d="M113 85h27" stroke="#b85231" />
              <text x="147" y="88" fontSize="10" fontFamily="monospace" fill="#18323b">
                EMBER SHELTER
              </text>
            </svg>
            <div className="map-caption">
              <span>
                <span className="status-dot" />
                FLOOD-EMBER-26
              </span>
              <span>FICTIONAL INCIDENT</span>
            </div>
          </div>
        </section>
        <div className="workspace-toolbar">
          <nav aria-label="Procurement stages">
            {stages.map((s, i) => (
              <button
                key={s}
                aria-label={s}
                className={s === stage ? 'active' : ''}
                aria-current={s === stage ? 'step' : undefined}
                onClick={() => {
                  setStage(s);
                  setError('');
                }}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
                {s}
                {i < 3 && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>
          <button className="text-button receive-button" onClick={() => setDialog('receive')}>
            <ScanLine size={16} />
            Receive handoff
          </button>
        </div>
        {error && (
          <div role="alert" className="error global-message">
            {error}
            <button className="text-button" onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        )}
        {notice && (
          <div className="success global-message" role="status">
            <CheckCircle size={16} />
            {notice}
            <button className="text-button" onClick={() => setNotice('')}>
              Dismiss
            </button>
          </div>
        )}
        <div className="workspace">
          <aside className="request-rail" aria-label="Incident requests">
            <div className="rail-heading">
              <div>
                <span className="eyebrow">EMBER RESPONSE</span>
                <h2>
                  Resource ledger <span>{displayed.length.toString().padStart(2, '0')}</span>
                </h2>
              </div>
              <button
                className="add-button"
                aria-label="New field request"
                onClick={() => setDialog('form')}
              >
                <Plus size={19} />
              </button>
            </div>
            <div className="request-list">
              {displayed.map((r) => {
                const row = state.records.find((x) => x.record.id === r.id);
                const qr =
                  outbox.find((x) => x.request.id === r.id)?.provenance.source === 'qr-import';
                return (
                  <button
                    className={r.id === record.id ? 'request-item selected' : 'request-item'}
                    key={r.id}
                    onClick={() => {
                      setSelected(r.id);
                      setNotice('');
                      setError('');
                    }}
                  >
                    <div className="request-item-top">
                      <span className="mono">{r.id}</span>
                      <span
                        className={
                          r.urgency === 'urgent' || r.urgency === 'critical'
                            ? 'urgency urgent'
                            : 'urgency'
                        }
                      >
                        {r.kind === 'claim' ? 'CLAIM' : r.urgency.toUpperCase()}
                      </span>
                    </div>
                    <strong>{r.resources[0].description}</strong>
                    <div className="request-item-bottom">
                      <span>
                        {qr
                          ? 'QR import · untrusted'
                          : (row?.status ??
                            (outbox.some((x) => x.request.id === r.id)
                              ? 'Locally preserved'
                              : 'Synthetic fixture'))}
                      </span>
                      <span>{money(r.amountCents)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="rail-foot">
              <Radio size={20} />
              <div>
                <strong>Built for the gap.</strong>
                <p>
                  Local records survive reload.
                  <br />
                  QR packets bridge disconnection.
                </p>
              </div>
            </div>
            <button
              className="text-button seed-button"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  for (const r of [demoRequest, duplicate, claim]) await saveRequest(r);
                  await loadLocal();
                  setNotice('Three fictional demo records loaded. No payment executed.');
                })
              }
            >
              Load synthetic demo records <ArrowRight size={14} />
            </button>
          </aside>
          <article className="record-panel">
            <div className="record-heading">
              <div>
                <span className="eyebrow">
                  {record.kind === 'claim' ? 'EXPENSE CLAIM' : 'SUPPLY REQUEST'} / {record.id}
                </span>
                <h2>
                  {record.kind === 'claim'
                    ? 'Documented expense'
                    : record.id.startsWith('RL-DEMO')
                      ? 'Ember shelter resupply'
                      : record.resources[0].description}
                </h2>
                <p className="small">
                  {record.incident ?? 'Incident unknown'} <span>·</span> revision {record.revision}{' '}
                  <span>·</span> {record.origin}
                </p>
              </div>
              <span className={payment?.state === 'PAID' ? 'tag confirmed' : 'tag'}>
                {payment?.state === 'PAID'
                  ? 'Sandbox paid'
                  : remote?.status === 'approved'
                    ? 'Purchase authorized'
                    : (remote?.status ??
                      (provenance?.source === 'qr-import'
                        ? 'QR import · untrusted'
                        : provenance
                          ? 'Locally preserved'
                          : 'Synthetic fixture'))}
              </span>
            </div>
            {stage === 'Request' && (
              <section className="stage-content">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">01 / PRESERVE THE NEED</span>
                    <h2>Supplies needed. Connection optional.</h2>
                  </div>
                  <Package size={25} />
                </div>
                <div className="resource-table">
                  <div className="table-heading">
                    <span>RESOURCE</span>
                    <span>QUANTITY</span>
                  </div>
                  {record.resources.map((r, i) => (
                    <div className="resource-row" key={i}>
                      <span>
                        <span className="resource-number">{String(i + 1).padStart(2, '0')}</span>
                        <strong>{r.description}</strong>
                      </span>
                      <span className="mono">{r.quantity ?? 'Unknown'}</span>
                    </div>
                  ))}
                </div>
                <div className="record-facts">
                  <div>
                    <span>Requested amount</span>
                    <strong>{money(record.amountCents)}</strong>
                    <span className="small">
                      {record.amountKind === 'exact'
                        ? 'Exact · subject to human approval'
                        : record.amountKind}
                    </span>
                  </div>
                  <div>
                    <span>Operational location</span>
                    <strong>{record.location ?? 'Explicitly unknown'}</strong>
                    <span className="small">Non-sensitive fictional label</span>
                  </div>
                </div>
                <div className="preservation-note">
                  <CheckCircle size={20} />
                  <div>
                    <strong>
                      {provenance
                        ? 'Preserved in IndexedDB'
                        : 'Synthetic fixture · ready to preserve'}
                    </strong>
                    <p>
                      {provenance?.source === 'qr-import'
                        ? 'QR import · untrusted. Import provenance retained.'
                        : 'No financial authority travels with this record.'}{' '}
                      Created {new Date(record.createdAt).toLocaleString()}.
                    </p>
                  </div>
                </div>
                {unknownFields(record).length > 0 && (
                  <p className="notice small">
                    Unknown information: {unknownFields(record).join(', ')}. Incomplete fields may
                    block authorization.
                  </p>
                )}
                <div className="request-actions">
                  <button className="secondary" onClick={() => setDialog('handoff')}>
                    <ScanLine size={17} />
                    QR handoff
                  </button>
                  <button className="primary" onClick={() => setStage('Review')}>
                    Continue to review <ArrowRight size={17} />
                  </button>
                </div>
              </section>
            )}
            {stage === 'Review' && (
              <ReviewPanel
                key={record.id}
                record={record}
                remote={remote}
                provenance={provenance?.source}
                authenticated={authenticated}
                busy={busy}
                act={act}
                refresh={refresh}
              />
            )}
            {stage === 'Pay' && (
              <PayPanel
                key={record.id}
                record={record}
                remote={remote}
                payment={payment}
                configured={configured}
                busy={busy}
                act={act}
                refresh={refresh}
              />
            )}
            {stage === 'Audit' && (
              <AuditPanel events={state.events} chain={state.chain} authenticated={authenticated} />
            )}
          </article>
        </div>
        <footer>
          <span>
            WAYLATCH <span className="footer-slash">/</span> LeftSock Labs
          </span>
          <p>
            Synthetic demonstration. No real emergencies, identities or funds. PayPal Sandbox only.
          </p>
        </footer>
      </main>
      {dialog === 'form' && <RequestForm onSave={preserve} onClose={() => setDialog(null)} />}
      {dialog === 'handoff' && <Handoff request={record} onClose={() => setDialog(null)} />}
      {dialog === 'receive' && (
        <Receiver onClose={() => setDialog(null)} onImport={(r) => preserve(r, 'qr-import')} />
      )}
      {dialog === 'login' && (
        <Dialog title="Coordinator access" onClose={() => setDialog(null)}>
          <p className="muted">
            Use the passphrase configured securely on the server. Credentials stay out of field
            records and QR packets.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const passphrase = String(new FormData(e.currentTarget).get('passphrase'));
              act(async () => {
                await api('/session', { password: passphrase });
                await refresh();
                setDialog(null);
              });
            }}
          >
            <label>
              Coordinator passphrase
              <input name="passphrase" type="password" autoComplete="current-password" required />
            </label>
            <button className="primary wide" disabled={busy}>
              Sign in
            </button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
        </Dialog>
      )}
    </>
  );
}
