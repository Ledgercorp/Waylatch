import { useState } from 'react';
import { AlertTriangle, Sparkles, Check } from 'lucide-react';
import type { ResourceRequest } from '../requests/schema';
import type { StoredRecord } from '../../server/store';
import type { ReviewAssessment } from '../risk/review';
import { api } from './api';
export function ReviewPanel({
  record,
  remote,
  provenance,
  authenticated,
  busy,
  act,
  refresh,
}: {
  record: ResourceRequest;
  remote?: StoredRecord;
  provenance?: string;
  authenticated: boolean;
  busy: boolean;
  act: (fn: () => Promise<void>) => void;
  refresh: () => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [risk, setRisk] = useState<ReviewAssessment | null>(null);
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
            disabled={busy}
            onClick={() =>
              act(async () => {
                setRisk(await api<ReviewAssessment>('/risk/' + record.id, {}));
                await refresh();
              })
            }
          >
            <Sparkles size={16} />
            Run local semantic review
          </button>
          {risk && (
            <div className="risk-results">
              <p className="tag">
                {risk.mode === 'semantic-local'
                  ? 'Real local AI inference'
                  : 'Deterministic indicators only'}
              </p>
              {risk.limitation && <p className="small">{risk.limitation}</p>}
              {risk.candidates.length === 0 && (
                <p>No comparison records available. Add a second synthetic request or claim.</p>
              )}
              {risk.candidates.map((candidate) => (
                <article className="risk-pair" key={candidate.id}>
                  <div>
                    <strong>{candidate.id}</strong>
                    <span className={candidate.reviewRecommended ? 'review-flag' : 'safe-flag'}>
                      {candidate.reviewRecommended ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <Check size={14} />
                      )}{' '}
                      {candidate.reviewRecommended ? 'Review recommended' : 'No duplicate signal'}
                    </span>
                  </div>
                  {candidate.similarity !== null && (
                    <p className="small mono">
                      Semantic cosine {candidate.similarity.toFixed(3)} · not a probability
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
