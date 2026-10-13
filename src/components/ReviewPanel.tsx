import { useId, useState } from 'react';
import { AlertTriangle, Sparkles, Check } from 'lucide-react';
import type { ResourceRequest } from '../requests/schema';
import type { StoredRecord } from '../../server/store';
import type { ReviewAssessment } from '../risk/review';
import type { AuditEvent } from '../audit/chain';
import { api } from './api';
import { PairComparison } from './PairComparison';
export function ReviewPanel({
  record,
  remote,
  provenance,
  authenticated,
  busy,
  act,
  refresh,
  comparisonRecords = [],
  relationshipEvents = [],
}: {
  record: ResourceRequest;
  remote?: StoredRecord;
  provenance?: string;
  authenticated: boolean;
  busy: boolean;
  act: (fn: () => Promise<void>) => void;
  refresh: () => Promise<void>;
  comparisonRecords?: Array<StoredRecord | ResourceRequest>;
  relationshipEvents?: AuditEvent[];
}) {
  const selectorId = useId();
  const [note, setNote] = useState('');
  const [risk, setRisk] = useState<ReviewAssessment | null>(null);
  const [riskRevision, setRiskRevision] = useState<number | null>(null);
  const [assessedRevisions, setAssessedRevisions] = useState<Record<string, number>>({});
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const snapshots = comparisonRecords
    .map((source) => ({
      record: 'record' in source ? source.record : source,
      saved: 'record' in source,
    }))
    .filter((snapshot) => snapshot.record.id !== record.id);
  const activeSnapshot =
    snapshots.find((snapshot) => snapshot.record.id === selectedCandidate) ?? snapshots[0];
  const currentRisk = riskRevision === record.revision ? risk : null;
  const activeAssessment =
    activeSnapshot && assessedRevisions[activeSnapshot.record.id] === activeSnapshot.record.revision
      ? currentRisk?.candidates.find((candidate) => candidate.id === activeSnapshot.record.id)
      : undefined;
  return (
    <section className="stage-content">
      <div className="section-heading">
        <div>
          <span className="eyebrow">02 / HUMAN REVIEW</span>
          <h2>Evidence before authorization.</h2>
        </div>
        <Sparkles size={25} />
      </div>
      <p className="muted">
        Similarity is a reason to inspect a record. It is not proof of fraud. AI cannot authorize,
        reject or execute a payment.
      </p>
      {!remote ? (
        <div className="notice">
          <strong>Preserved locally · awaiting coordinator</strong>
          <p>
            Explicitly upload this record when connectivity is available. Reconnection never starts
            a payment.
          </p>
          <button
            className="primary"
            disabled={!authenticated || busy || !navigator.onLine}
            onClick={() =>
              act(async () => {
                await api('/requests', {
                  record,
                  provenance: provenance === 'qr-import' ? 'qr' : 'local',
                });
                await refresh();
              })
            }
          >
            Send to coordinator review
          </button>
          {!authenticated && <p className="small">Sign in as coordinator to continue.</p>}
        </div>
      ) : (
        <>
          <button
            className="secondary"
            disabled={busy || !authenticated || remote.record.revision !== record.revision}
            onClick={() =>
              act(async () => {
                setRisk(await api<ReviewAssessment>('/risk/' + record.id, {}));
                setRiskRevision(record.revision);
                setAssessedRevisions(
                  Object.fromEntries(
                    snapshots.map((snapshot) => [snapshot.record.id, snapshot.record.revision]),
                  ),
                );
                await refresh();
              })
            }
          >
            <Sparkles size={16} />
            Run local semantic review
          </button>
          {currentRisk && (
            <div className="risk-results">
              <p className="tag">
                {currentRisk.mode === 'semantic-local'
                  ? 'Real local AI inference'
                  : 'Deterministic indicators only'}
              </p>
              {currentRisk.limitation && <p className="small">{currentRisk.limitation}</p>}
              {currentRisk.candidates.length === 0 && (
                <p>No comparison records available. Add a second synthetic request or claim.</p>
              )}
              {currentRisk.candidates.map((candidate) => (
                <article className="risk-pair" key={candidate.id}>
                  <div>
                    {snapshots.some((snapshot) => snapshot.record.id === candidate.id) ? (
                      <button
                        className="secondary"
                        aria-pressed={activeSnapshot?.record.id === candidate.id}
                        onClick={() => setSelectedCandidate(candidate.id)}
                      >
                        Compare {candidate.id}
                      </button>
                    ) : (
                      <strong>{candidate.id}</strong>
                    )}
                    <span className={candidate.reviewRecommended ? 'review-flag' : 'safe-flag'}>
                      {candidate.reviewRecommended ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <Check size={14} />
                      )}{' '}
                      {candidate.reviewRecommended
                        ? 'Review recommended'
                        : 'No review recommendation'}
                    </span>
                  </div>
                  {currentRisk.mode === 'semantic-local' && candidate.similarity !== null && (
                    <p className="small mono">
                      Semantic cosine {candidate.similarity.toFixed(3)} · not a fraud probability
                    </p>
                  )}
                  <ul>
                    {candidate.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <p className="small">No payment action taken.</p>
                </article>
              ))}
            </div>
          )}
          {activeSnapshot && (
            <div className="review-comparisons">
              <label htmlFor={selectorId}>Compare with a saved record</label>
              <select
                id={selectorId}
                value={activeSnapshot.record.id}
                disabled={busy}
                onChange={(event) => setSelectedCandidate(event.target.value)}
              >
                {snapshots.map((snapshot) => (
                  <option key={snapshot.record.id} value={snapshot.record.id}>
                    {snapshot.record.id} · {snapshot.record.resources[0]?.description}
                  </option>
                ))}
              </select>
              <PairComparison
                key={`${record.id}:${record.revision}:${activeSnapshot.record.id}:${activeSnapshot.record.revision}`}
                record={record}
                candidate={activeSnapshot.record}
                assessment={activeAssessment}
                mode={activeAssessment ? currentRisk?.mode : undefined}
                relationshipEvents={relationshipEvents}
                authenticated={authenticated}
                canPersist={activeSnapshot.saved && remote.record.revision === record.revision}
                busy={busy}
                act={act}
                refresh={refresh}
              />
            </div>
          )}
          <div className="review-disposition">
            <h3>Human disposition</h3>
            <p className="muted">
              Check incident, quantities, amount and any duplicate indicators. Hold ambiguous
              records.
            </p>
            <label>
              Review note
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="What did you verify?"
              />
            </label>
            <div className="button-row">
              <button
                className="secondary"
                disabled={
                  busy ||
                  note.trim().length < 3 ||
                  ['approved', 'reimbursement-approved'].includes(remote.status)
                }
                onClick={() =>
                  act(async () => {
                    await api(`/requests/${record.id}/review`, {
                      revision: record.revision,
                      disposition: 'hold',
                      note,
                    });
                    await refresh();
                  })
                }
              >
                Hold for clarification
              </button>
              <button
                className="primary"
                disabled={
                  busy ||
                  note.trim().length < 3 ||
                  ['approved', 'reimbursement-approved'].includes(remote.status)
                }
                onClick={() =>
                  act(async () => {
                    await api(`/requests/${record.id}/review`, {
                      revision: record.revision,
                      disposition: 'clear',
                      note,
                    });
                    await refresh();
                  })
                }
              >
                Mark reviewed
              </button>
            </div>
            {remote.reviewNote && <p className="small">Recorded note: {remote.reviewNote}</p>}
          </div>
        </>
      )}
    </section>
  );
}
