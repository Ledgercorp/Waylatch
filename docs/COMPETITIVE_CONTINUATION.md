# Competitive development checkpoint for environment refresh

User requested all six competitive phases, then requested an environment refresh after model access could not be applied to this running worker. This is a **development checkpoint**, not a completed release. Preserve verified release candidate `3580d35a7176afd93abf52fbde391061a4ff30d6` on main/release-candidate. Resume the new work from the separate private branch `feat/waylatch-competitive`.

## Network boundary

The user authorized Hugging Face model-download hosts and asked to apply them to the active environment. Available cloud tools expose only `environment_status`, not restart/configuration mutation. Current enforced custom allowlist still contains only api-m.sandbox.paypal.com. Pinned model download failed with proxy CONNECT403; no bypass or credential change was attempted. [Failure log](evidence/competitive-model-download.log). Refresh must select a configuration that permits huggingface.co and its official weight-download redirects, including cas-bridge.xethub.hf.co. Verify actual policy/readiness before retrying. No model files were found in this worker; installed ONNX native runtime is available.

The workspace files are preserved privately so a refreshed task can continue. Do not repeat PayPal authentication/order/buyer/capture work; the genuine USD1.00 purchase remains completed and independently verified. Do not adopt MIT, publish source/video, accept terms or submit Devpost. $0 real spending.

## Implemented preparation

- Dataset author created240 fictional English scenarios,12 supply families×20;80 calibration cases in4 families,160 heldout in8 disjoint families. Scenarios supply constructed procurement facts; they are not real field data or expert-human labels. The unlabeled file must receive independent model-blind annotation. Author construction intent is separately stored and must be withheld from the independent reviewer. Preserve the original12-case benchmark.
- Evaluation metrics/runner support deterministic, semantic-only and existing combined methods; genuine local CPU embeddings only, family-grouped uncertainty, latency/source fingerprints, calibration→freeze→heldout and rerun protection. Actual inference/evaluation has **not executed**; independent annotations are absent.
- Comparison module/ReviewPanel/PairComparison support side-by-side terms/context, exact/unknown/conflicting evidence, honest AI/fallback labels and advisory relationship dispositions. Parent App props/CSS integration and browser tests remain pending.
- Proof Trail module/component support chronological distinct source labels, missing-event honesty, sanitized summaries and separate unchanged original organization-chain export. Parent App navigation/CSS and historical archive selection remain pending. Redacted summaries are not original hash preimages.
- Judge runtime and one-command bootstrap implement isolated fictional database, private in-memory passphrase, loopback bootstrap session, separate validated historical seven-event archive and blocked provider/financial operations. Existing application is compiled only when absent/outdated; this does not reconstruct the project. Parent Start judge demo button/guided walkthrough is pending. Actual launch/model validation remains pending model access.
- CrisisCodec ownership docs now reflect reuse from Colby Weiss's own project. Read-only affected-file history and matching source hashes found Colby as author/committer and no independent attribution in the two primitives. Missing earlier MIT is not an internal-development blocker. Independently owned unrecorded/copied material, if identified, and application-wide MIT/public release remain separate questions.

## Integration contracts

`ReviewPanel` accepts optional `comparisonRecords: Array<StoredRecord | ResourceRequest>` and `relationshipEvents: AuditEvent[]`; pass server state.records/events. Authenticated POST `/api/requests/:id/relationships` requires candidateId,revision,candidateRevision,disposition related|unrelated|investigate and note3..1000. It appends `pair_disposition_recorded` without changing review/approval/payment state.

`ProofTrail` is a named export from src/components/ProofTrail.tsx. Its input is `{record,provenance?,payment?,events,chain?,providerEvidence?}`. Types and honest provenance/export logic are in src/proof/trail.ts. The historical provider contract and original seven-event audit are returned by judge `/api/demo` in `archive`; do not inject that historical payment into new fictional judge records.

Judge mode is opt-in `createApp({judgeMode:true,judgeArchive,...})`. `/api/demo` supplies public sanitized historical evidence/guide; POST `/api/demo/session` requires exact loopback Origin/Host and grants a normal cookie session only in this mode. Financial approval, claim approval, order/capture, provider inspection and webhook routes are blocked in judge mode, including case/trailing-slash variants. Production mode authentication/payment gates remain intact.

## Resume in engineering priority order

1. Verify model access, run `npm run model:download`, and validate every pinned asset digest in src/risk/model-assets.ts. Do not switch model or fabricate embeddings.
2. Independently annotate shuffled `{id,scenario,left,right}` cases, withholding category/group/split/author key/model outputs. Save evaluation/independent-annotations.json with schema/dataset IDs and annotations `{caseId,decision:duplicate|distinct|ambiguous,rationale,confidence}`. Disclose nonhuman agent review versus expert/field labeling. Exclude unresolved binary cases.
3. Run `npm run ai:evaluate -- --mode calibration`; inspect calibration only. Any responsible scoring change must be based solely on calibration, preserve old behavior/contracts/tests or document intended refinement. Freeze with `--mode freeze`, then once run `--mode heldout`. Never tune on heldout or overwrite its completed receipt. Read evaluation/EVALUATION_PROTOCOL.md first.
4. Integrate comparison props and Proof Trail into existing App; add focused responsive styles matching current identity. Build the guided judge UI with offline/reload/QR/tutorial steps and clearly separate historical archived payment. No live/automatic financial decisions.
5. Record explicit browser-local offline/QR facts only where actually observed; legacy provenance alone does not establish offline action. Preserve database name/version, RL1 schemas, original event hashes and existing payment references.
6. Add measured resilience/performance checks and browser difficult-case/a11y/mobile verification. Complete real-model startup/inference/resource measurements. Existing earlier checks do not substitute for new claims.
7. Update authentic under-three-minute video with new comparison/Proof Trail and archived settled payment. Do not reenact historical checkout/capture or claim it occurred during playback.
8. Clean-install/full-regression verify the extended existing source, scope secret/release scans, synchronize private GitHub, and write the final truthful readiness report. Public/legal/submission approvals remain pending; no new financial operation is needed.

## Files and current verification scope

Dataset: evaluation/cases-unlabeled.json, author-scenario-key.json, DATASET_PROTOCOL.md; reproducible scripts/build-evaluation-cases.py. Dataset source was authored before any model predictions. Author intent is not independent annotation.

The complete checkpoint unit/integration suite passed: 24 test files, 124 tests. `tsc --noEmit` passed after concurrent file creation completed. Results are retained in evidence/competitive-checkpoint-tests.log and evidence/competitive-checkpoint-typecheck.log. No actual model evaluation, browser integration, performance report, final new video or completed competitive phase is claimed at this checkpoint.

A fresh environment-status inspection after the refresh request reported matching desired/observed revision 24, running and connected, but the enforced custom hosts still contained only api-m.sandbox.paypal.com. The download hosts were still absent. No available tool can restart or reconfigure this worker.
