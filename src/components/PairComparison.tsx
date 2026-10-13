import { useId, useState } from 'react';
import type { AuditEvent } from '../audit/chain';
import { description, type ResourceRequest } from '../requests/schema';
import {
  compareDescriptions,
  compareRequestEvidence,
  latestPairDisposition,
  type PairDisposition,
} from '../risk/comparison';
import type { ReviewAssessment } from '../risk/review';
import { api } from './api';

export function PairComparison({
  record,
  candidate,
  assessment,
  mode,
  relationshipEvents = [],
  authenticated,
  canPersist,
  busy,
  act,
  refresh,
}: {
  record: ResourceRequest;
  candidate: ResourceRequest;
  assessment?: ReviewAssessment['candidates'][number];
  mode?: ReviewAssessment['mode'];
  relationshipEvents?: AuditEvent[];
  authenticated: boolean;
  canPersist: boolean;
  busy: boolean;
  act: (fn: () => Promise<void>) => void;
  refresh: () => Promise<void>;
}) {
  const formId = useId();
  const [note, setNote] = useState('');
  const [disposition, setDisposition] = useState<PairDisposition>('investigate');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedEvent, setSavedEvent] = useState<AuditEvent | null>(null);
  const comparison = compareDescriptions(description(record), description(candidate));
  const latest = latestPairDisposition(
    savedEvent ? [...relationshipEvents, savedEvent] : relationshipEvents,
    record,
    candidate,
  );
  const realAI =
    mode === 'semantic-local' &&
    assessment?.similarity !== null &&
    assessment?.similarity !== undefined;
  const facts = compareRequestEvidence(record, candidate);
  const disabled = busy || saving || !authenticated || !canPersist;
  const renderDescription = (parts: typeof comparison.left) =>
    parts.map((part, index) =>
      part.kind === 'plain' ? (
        part.text
      ) : (
        <mark key={index} className={`comparison-term-${part.kind}`}>
          {part.text}
        </mark>
      ),
    );
  return (
    <article className="pair-comparison" aria-label={`Compare ${record.id} with ${candidate.id}`}>
      <h3>Record comparison</h3>
      <p className="small">
        Advisory context, not proof of duplication. Human financial authorization remains a separate
        step.
      </p>
      <div className="comparison-inference" aria-live="polite">
        <span className="tag">
          {realAI
            ? 'AI · local semantic inference'
            : mode === 'deterministic-only'
              ? 'Deterministic evidence'
              : 'AI similarity not run'}
        </span>
        {realAI ? (
          <p className="small mono">
            Semantic cosine {assessment.similarity!.toFixed(3)} · description similarity, not a
            fraud probability.
          </p>
        ) : (
          <p className="small">
            {mode === 'deterministic-only'
              ? 'No semantic inference executed. Compare recorded evidence below.'
              : 'Run local semantic review to request a description similarity comparison.'}
          </p>
        )}
        {assessment && (
          <p className="small">
            {assessment.reviewRecommended
              ? 'Review recommended by the recorded assessment.'
              : 'No review recommendation from this assessment; this does not establish that records are unrelated.'}
          </p>
        )}
        {!!assessment?.reasons.length && (
          <ul>
            {assessment.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </div>
      <p className="small comparison-legend">
        Shared terms are highlighted after case and Unicode normalization; differing terms are
        underlined. These are text matches, not an explanation of model reasoning.
      </p>
      <div className="comparison-descriptions">
        <section>
          <h4>Selected · {record.id}</h4>
          <p className="small">Revision {record.revision}</p>
          <p className="comparison-description">{renderDescription(comparison.left)}</p>
        </section>
        <section>
          <h4>Compared · {candidate.id}</h4>
          <p className="small">Revision {candidate.revision}</p>
          <p className="comparison-description">{renderDescription(comparison.right)}</p>
        </section>
      </div>
      <p className="small">
        Shared exact terms:{' '}
        {comparison.sharedTerms.length ? comparison.sharedTerms.join(', ') : 'None'}
      </p>
      <div className="comparison-evidence">
        <table>
          <caption>Recorded context · deterministic evidence</caption>
          <thead>
            <tr>
              <th scope="col">Evidence</th>
              <th scope="col">Selected record</th>
              <th scope="col">Compared record</th>
              <th scope="col">Finding</th>
            </tr>
          </thead>
          <tbody>
            {facts.map((fact) => (
              <tr key={fact.label}>
                <th scope="row">{fact.label}</th>
                <td>{fact.left}</td>
                <td>{fact.right}</td>
                <td>
                  <span className={`comparison-evidence-${fact.state}`}>
                    {fact.state === 'same'
                      ? 'Exact recorded match'
                      : fact.state === 'different'
                        ? 'Recorded difference'
                        : 'Missing evidence'}
                  </span>
                  <p className="small">{fact.detail}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {latest && (
        <aside className="notice comparison-saved" aria-label="Latest saved pair disposition">
          <strong>Latest saved pair disposition: {latest.disposition}</strong>
          <p>{latest.note}</p>
          <p className="small">
            Audit event #{latest.seq} · {latest.at}
            {!latest.currentRevisions &&
              ' · Applies to earlier revisions; inspect current records again.'}
          </p>
        </aside>
      )}
      <form
        className="pair-disposition"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled || note.trim().length < 3 || note.trim().length > 1000) return;
          setSaving(true);
          setError('');
          act(async () => {
            try {
              const saved = await api<AuditEvent>(`/requests/${record.id}/relationships`, {
                candidateId: candidate.id,
                revision: record.revision,
                candidateRevision: candidate.revision,
                disposition,
                note: note.trim(),
              });
              setSavedEvent(saved);
              setNote('');
              await refresh();
            } catch (failure) {
              setError(
                failure instanceof Error ? failure.message : 'Unable to save the pair disposition.',
              );
              throw failure;
            } finally {
              setSaving(false);
            }
          });
        }}
      >
        <h4>Pair disposition · advisory</h4>
        <p className="small">
          Save your judgment about this pair to the audit trail. It does not mark either record
          reviewed, approve a claim or change payment state.
        </p>
        <label htmlFor={`${formId}-disposition`}>Relationship judgment</label>
        <select
          id={`${formId}-disposition`}
          value={disposition}
          disabled={disabled}
          onChange={(event) => setDisposition(event.target.value as PairDisposition)}
        >
          <option value="investigate">Investigate further</option>
          <option value="related">Related records</option>
          <option value="unrelated">Unrelated records</option>
        </select>
        <label htmlFor={`${formId}-note`}>Pair disposition note</label>
        <textarea
          id={`${formId}-note`}
          value={note}
          disabled={disabled}
          onChange={(event) => setNote(event.target.value)}
          minLength={3}
          maxLength={1000}
          rows={3}
          placeholder="Explain the relationship and what you verified."
          aria-describedby={`${formId}-help`}
        />
        <p id={`${formId}-help`} className="small">
          3–1000 characters. Each saved judgment adds an audit event; earlier notes remain in the
          trail.
        </p>
        <button className="secondary" disabled={disabled || note.trim().length < 3} type="submit">
          {saving ? 'Saving pair disposition…' : 'Record pair disposition'}
        </button>
        {!authenticated && (
          <p className="small">Sign in as coordinator to record a pair disposition.</p>
        )}
        {!canPersist && (
          <p className="small">
            Both record snapshots must be saved at the coordinator before recording a pair
            disposition.
          </p>
        )}
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        <p className="small" role="status">
          {saving
            ? 'Saving advisory judgment.'
            : savedEvent
              ? 'Pair disposition saved to the audit trail. No payment action taken.'
              : ''}
        </p>
      </form>
    </article>
  );
}
