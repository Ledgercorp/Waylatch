import { useId, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { ResourceRequest } from '../requests/schema';
import type { StoredRecord } from '../../server/store';
import type { QualityAssessment } from '../risk/review-quality';
import { TIER_LABELS, type ReviewTier } from '../risk/review-tiers';
import { latestPairDisposition } from '../risk/comparison';
import type { AuditEvent } from '../audit/chain';
import { api } from './api';
import { PairComparison } from './PairComparison';
import { sameRequestSnapshot } from '../requests/snapshot';
type RiskEvidence = QualityAssessment & { assessedRevisions?: Record<string, number> };
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
  const [risk, setRisk] = useState<QualityAssessment | null>(null);
  const [riskRevision, setRiskRevision] = useState<number | null>(null);
  const [assessedRevisions, setAssessedRevisions] = useState<Record<string, number>>({});
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const snapshots = comparisonRecords
    .map((source) => ({
      record: 'record' in source ? source.record : source,
      saved: 'record' in source,
    }))
    .filter((snapshot) => snapshot.record.id !== record.id);
  const matchesCoordinator = !!remote && sameRequestSnapshot(record, remote.record);
  const currentRisk = matchesCoordinator && riskRevision === record.revision ? risk : null;
  const currentCandidates =
    currentRisk?.candidates.filter((candidate) => {
      const snapshot = snapshots.find((entry) => entry.record.id === candidate.id);
      return snapshot && assessedRevisions[candidate.id] === snapshot.record.revision;
    }) ?? [];
  const dismissed = new Set(
    currentCandidates
      .filter((candidate) => {
        const snapshot = snapshots.find((entry) => entry.record.id === candidate.id);
        const latest =
          snapshot && latestPairDisposition(relationshipEvents, record, snapshot.record);
        return latest?.currentRevisions && latest.disposition === 'unrelated';
      })
      .map((candidate) => candidate.id),
  );
  const rankedSnapshots = [...snapshots].sort((a, b) => {
    const ai = currentCandidates.findIndex((c) => c.id === a.record.id);
    const bi = currentCandidates.findIndex((c) => c.id === b.record.id);
    return (
      (dismissed.has(a.record.id) ? 1 : 0) - (dismissed.has(b.record.id) ? 1 : 0) ||
      (ai < 0 ? 1000 : ai) - (bi < 0 ? 1000 : bi)
    );
  });
  const activeSnapshot =
    snapshots.find((snapshot) => snapshot.record.id === selectedCandidate) ?? rankedSnapshots[0];
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
      {remote && !matchesCoordinator ? (
        <div className="notice" role="alert">
          <strong>Local and coordinator snapshots differ</strong>
          <p>
            This local or QR record is not the content held by the coordinator. Review evidence and
            payment controls cannot apply to it. Use “View coordinator snapshot” above, or
            explicitly submit a newer revision.
          </p>
          {record.revision > remote.record.revision && (
            <button
              className="secondary"
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
              Submit newer revision to coordinator
            </button>
          )}
        </div>
      ) : !remote ? (
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
                const evidence = await api<RiskEvidence>('/risk/' + record.id, {});
                setRisk(evidence);
                setRiskRevision(evidence.assessedRevisions?.[record.id] ?? null);
                setAssessedRevisions(evidence.assessedRevisions ?? {});
                await refresh();
              })
            }
          >
            <Sparkles size={16} />
            Run local semantic review
          </button>
          {activeSnapshot && (
            <div className="review-comparisons">
              <label htmlFor={selectorId}>Compare with a saved record</label>
              <select
                id={selectorId}
                value={activeSnapshot.record.id}
                disabled={busy}
                onChange={(event) => setSelectedCandidate(event.target.value)}
              >
                {rankedSnapshots.map((snapshot) => (
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
          {currentRisk && (
            <div className="risk-results">
              <p className="tag">
                {currentRisk.mode === 'semantic-local'
                  ? 'Real local AI inference'
                  : 'Deterministic indicators only'}
              </p>
              {currentRisk.limitation && <p className="small">{currentRisk.limitation}</p>}
              {currentCandidates.length !== currentRisk.candidates.length && (
                <p className="notice small">
                  Some assessment snapshots changed or are no longer available. Their stale scores
                  are hidden; run review again for current evidence.
                </p>
              )}
              {currentCandidates.length === 0 && (
                <p>No comparison records available. Add a second synthetic request or claim.</p>
              )}
              <p className="notice" role="status">
                Assessment attention: {currentCandidates.filter((c) => c.reviewRecommended).length}{' '}
                · strong evidence:{' '}
                {currentCandidates.filter((c) => c.tier === 'strong-duplicate-evidence').length} ·
                informational:{' '}
                {currentCandidates.filter((c) => c.tier === 'potentially-related').length} ·
                dismissed as unrelated: {dismissed.size}. No financial action follows a tier or
                dismissal.
              </p>
              <details className="comparison-candidate-summaries">
                <summary>Candidate summaries · {currentCandidates.length} current records</summary>
                {(
                  [
                    'strong-duplicate-evidence',
                    'needs-verification',
                    'potentially-related',
                    'none',
                    'dismissed',
                  ] as const
                ).map((group) => {
                  const members = currentCandidates.filter((c) =>
                    group === 'dismissed'
                      ? dismissed.has(c.id)
                      : !dismissed.has(c.id) && c.tier === group,
                  );
                  if (!members.length) return null;
                  return (
                    <details
                      key={group}
                      open={group === 'strong-duplicate-evidence' || group === 'needs-verification'}
                    >
                      <summary>
                        {group === 'dismissed'
                          ? 'Dismissed for current revisions'
                          : TIER_LABELS[group as ReviewTier]}{' '}
                        · {members.length}
                      </summary>
                      {members.map((candidate) => (
                        <article className="risk-pair" key={candidate.id}>
                          <button
                            className="secondary"
                            aria-pressed={activeSnapshot?.record.id === candidate.id}
                            onClick={() => setSelectedCandidate(candidate.id)}
                          >
                            Compare {candidate.id}
                          </button>
                          <span
                            className={
                              candidate.tier === 'strong-duplicate-evidence'
                                ? 'review-flag'
                                : 'safe-flag'
                            }
                          >
                            {TIER_LABELS[candidate.tier]}
                          </span>
                          {candidate.similarity !== null && (
                            <p className="small mono">
                              Semantic cosine {candidate.similarity.toFixed(3)} · not a fraud
                              probability
                            </p>
                          )}
                          {!!candidate.contradictions.length && (
                            <p className="small">{candidate.contradictions.join('; ')}</p>
                          )}
                        </article>
                      ))}
                    </details>
                  );
                })}
              </details>
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
