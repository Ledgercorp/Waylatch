# Waylatch private release candidate — 2026-10-13

The genuine USD 1.00 simulated Sandbox purchase is independently verified, the existing demo is updated, and the submission materials are prepared for one consolidated owner decision. **Real spending: $0.** Repository visibility remains private; no public upload, license adoption, legal agreement or Devpost submission has occurred.

## Provider and approval evidence

Order **2W330508JA572391V**, capture **8WY07860808872629**, request **RL-REAL-20261013-201748 revision 1**. Actual user REVIEW/AUTHORIZE, genuine Sandbox personal-buyer approval and separate explicit CAPTURE preceded the payment. PayPal COMPLETED and Waylatch PAID are preserved in [saved result](evidence/paypal-real-sandbox.json).

A new independent authenticated inspector made read-only GET requests to Orders v2 and Payments capture details. Both returned HTTP 200 / COMPLETED, matching exact USD 1.00 amount, request reference, capture ID and single final capture. No create/capture/refund mutation was made. [Independent evidence](evidence/paypal-independent-verification.json) binds the unchanged saved result by SHA-256.

## Workflow verification matrix

| Stage                                                        | Evidence and limits                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Offline field continuity / actual QR image decode / local AI | Prior recorded application footage and prior nine-browser/69-local-test evidence retained; no unchanged production build or completed suite rerun.                                                                                                                                                           |
| Same USD 1.00 request protocol                               | New fourteen-packet text transport/out-of-order reconstruction preserves every field, identity/revision/amount; largest packet175bytes. [Result](evidence/release-handoff-record.json). It does not transfer payment authority or claim a new browser-offline/image-decoding run.                            |
| Review / authorization / buyer approval / capture            | Actual human decisions and genuine provider operations, seven linked audit events, stable preserved order/capture.                                                                                                                                                                                           |
| Authoritative transaction reconciliation                     | New independent order/capture GETs HTTP200/COMPLETED; exact amount/references.                                                                                                                                                                                                                               |
| Settled browser UI / server inspection / audit export        | Newly recorded actual PAID UI and seven-event audit. Create/capture controls disabled; browser authoritative inspection confirms COMPLETED; exported events exactly match copied SQLite; financial state unchanged. [Recording verification](evidence/settled-demo-recording.json).                          |
| Audit validation                                             | Seven-event hash chain independently matches persisted events. Judge CLI accepts raw-array or envelope exports and fails closed on malformed shapes/claimed-valid tampering. Four new focused regressions passed; [green log](evidence/release-audit-cli-green.log). No full73-test run is claimed.          |
| Webhooks                                                     | Actual registration/event GETs200 with zero registrations/events. Three unsigned/synthetic callbacks rejected400 by existing backend/gateway on an isolated real paid copy; state/audit unchanged. Genuine signed delivery/duplicate delivery remains unverified. [Exact status](WEBHOOK_RELEASE_STATUS.md). |
| Cleanup                                                      | One preserved request/order, seven events, zero original coordinator sessions. Recording/diagnostic copies and temporary listeners isolated; no existing account/record changed. No background payment process.                                                                                              |

The mobile loopback return-page failure is documented; authoritative provider inspection confirmed buyer approval independently. No return-page accessibility fix or production/emergency-readiness claim is made. Fresh production service-worker/offline/cold-install tests were not run because this continuation does not rebuild the application; prior results remain historical.

## Final demo and submission copy

The existing [MP4](demo/waylatch-engineering-preview.mp4) is **110.04seconds**,1600×900,H.264, silent with captions. SHA-256 **2c7bf7c0bc9f936f855b712b2f273dffead34023330ab62f6ae10080f7e43d58**,2,153,105bytes.

Original nonfinancial application footage is retained through83.84seconds, with automated fixtures labeled. Authentic settled PAID UI occupies83.84–94.08seconds, genuine seven-event audit footage94.08–102.16seconds, selected independently verified provider evidence102.16–110.04seconds. The separate USD1.00 purchase is distinguished from the original USD128 examples. Checkout login, buyer approval and capture actions were not screen-recorded or reenacted. [Complete provenance](evidence/demo-video.json), [prior metadata](evidence/demo-video-prior.json). Representative final frames were visually inspected and the complete MP4 decoded without errors.

[Devpost description](DEVPOST_DRAFT.md), [structured draft](../devpost-submission.md), [known fields](submission/project-fields.json), [submission package](submission/SUBMISSION_PACKAGE.md), [narration](demo/NARRATION.md), captions and screenshot captions are synchronized. Newly genuine [payment](evidence/payment-completed.png) and [audit](evidence/audit-paypal-completed.png) screenshots are included. No public YouTube URL or Devpost receipt is invented.

## Code and release checks

Application/payment/codec/AI/audit-chain source under src/server is unchanged. Added only read-only diagnostics, settled-state media tools and narrow release tooling. The audit CLI input-boundary bug was reproduced with two new failing tests, fixed, and verified with four focused passing regressions; original raw-array chain validation remains compatible and no event/hash schema changed.

TypeScript noEmit passed after the final tooling changes; scoped formatting and diff integrity passed. Media Python syntax and full video decoding passed. A source-only staged/tracked release scan checks configured credential values/specific private-key/token patterns without printing values. No production dist exists in this fresh workspace, so no new frontend-build scan is claimed; the default release checker still requires dist, and previous frontend checks remain historical. Final source-scan output is saved as evidence/release-final-source-check.log.

No .env, database, node_modules, models or raw runtime caches are proposed for Git publication. Actual account/payer data, tokens and generated passphrases were never printed or committed. All displayed incidents and records are fictional. [Artifact binding](evidence/release-artifact-manifest.json) identifies exact reviewed material.

## Private repository and owner decision

Existing Ledgercorp/Waylatch was independently confirmed **private**, default main, with authorized push access. Authentic RescueLedger ancestry and existing private branches are preserved; no force-push or repository creation. Private checkpoint/readback results are recorded after synchronization below.

The single [release approval packet](RELEASE_APPROVALS.md) covers source/contributor/CrisisCodec rights, copyright/MIT adoption, AMBER branding, existing-repository public visibility, exact video publication and conditional final Devpost action. Approval remains pending. Unknown registration/form fields and unseen legal agreements cannot be resolved by a generic approval.

Devpost identity/registration/requirements/judging/date reads return internal error-32603. The previous recorded official deadline is November12,2026 at20:00UTC; recheck the actual live form/rules before final entry. Authorized YouTube account/upload route and public URL remain pending. Genuine callback/Payouts remain disclosed optional limits. No paid or public service is required for the runnable-repository proposal.
