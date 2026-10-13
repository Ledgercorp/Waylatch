# RescueLedger durable project state

2026-10-13. Branch: **feat/rescueledger-mvp**. First verified milestone: **5bb6e37**. Final milestone and artifact hashes are recorded in the session report/artifact manifest; this file is an index, not source authority. Validate live Git and tests on resume.

## Implemented

Modular Request → Review → Pay → Audit React application; responsive maritime/rescue identity and fictional geographic context; strict procurement/claim schemas with unknown fields; IndexedDB requests/provenance/outbox and persistent receiver; production offline service worker; bounded RL1 MessagePack/CRC QR handoff and image import; coordinator HttpOnly sessions and server-side approval gates; durable SQLite source revisions/payment reservations and audit events; fixed-Sandbox OAuth/Orders v2/browser approval/capture/detail inspection; official webhook signature-verification client and persistent delivery/reconciliation statuses; stable idempotency/restart recovery and fixed first-capture retry timestamp; local receipt SHA-256 hashing with no image upload; separate human claim approval with Payouts explicitly blocked; pinned, hash-verified real local MiniLM embedding review and synthetic calibration benchmark.

Release-preparation artifacts: reproducible README, architecture/security/protocol/reuse docs, exact live hackathon excerpts, benchmark/test/screenshots, MIT proposal (not adopted), complete technology/project draft, 2:50 demo script and approval checklist. CrisisCodec reference unchanged.

## Verification

`npm test`: **40 passed**. `npm run test:e2e`: **7 passed**, including real AI endpoint, offline reload, two-context QR transfer, claim/audit/mobile and axe. `npm run build` and source format check passed. CPU model inference executed; synthetic calibration TP5/FP0/FN1/TN6. Independent CrisisCodec: **38 unit/integration + 7 browser tests passed**. Four real reproduced failure-classification/retry bugs fixed with regressions. Separate-process PayPal simulator is explicitly a simulator, not real account evidence. See VERIFICATION.md and docs/evidence/.

## Repository and budget

Private repository creation failed: authenticated GitHub integration lacks createRepository permission. No remote exists and nothing is publicly published/submitted. Preserve branch, source archive and Git bundle until an authorized private destination is available. $0 project charges; no real financial operation or paid service. No Mac dependence.

## External acceptance blockers

PayPal Sandbox client ID/secret/webhook ID absent from cloud bindings. Real order/buyer approve/capture and Payouts probe unexecuted. Public HTTPS webhook callback absent. Root license/public release/video/registration/legal terms/submission require owner decisions. No fabricated provider success. Project is not submission-complete.

## Next engineering action

Securely bind Sandbox credentials in Codex Cloud, run the app, then `npm run paypal:integration` through explicit AUTHORIZE → browser Sandbox buyer approval → CAPTURE. Save authoritative real evidence, correct any actual provider mismatch and rerun affected suites. Probe Payouts once next. Obtain authorized private Git destination and confirm remote commit. Public release and submission follow actual integration and owner approvals.
