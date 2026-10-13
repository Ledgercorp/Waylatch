# Waylatch verification ledger

Continuation date: 2026-10-13. Original RescueLedger reports remain under docs/history/ and branch feat/rescueledger-mvp. The following results were newly executed; they are not repetitions of the previous session's reported results.

## Real integrations and recoverable source

Original ee1488bde39347347d5a40e6bd766072fad7f16f and its three-commit history verified by Git object/bundle checks; SHA-256 artifacts matched the original manifest. Private GitHub push/read-back confirmed baseline main and feat/rescueledger-mvp refs; GitHub API confirmed source file and private visibility. Rebrand synchronization is recorded after its actual commit/push.

Real local MiniLM q8 inference executed again through the app's browser review test and the CPU benchmark. Remote model fetching during inference is disabled. Synthetic calibration TP5/FP0/FN1/TN6 remains a tiny tuning-set measurement, not a held-out fraud accuracy claim. Pinned model and asset hashes unchanged.

**No genuine PayPal OAuth/order/buyer approval/capture/Payouts call or real webhook delivery has executed.** Runtime bindings are absent. Unauthenticated HTTPS HEAD to Sandbox root returned403 and establishes only HTTP reachability, not authentication or API permission.

## Fresh commands

| Scope / command                                                                   | Result                      | Evidence                                                |
| --------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------- |
| Original baseline `npm test`                                                      | 40 passed                   | waylatch-baseline-local-tests.log                       |
| Original baseline `npm run build`                                                 | Passed                      | waylatch-baseline-build.log                             |
| Original baseline `npm run test:e2e`                                              | 7 passed                    | waylatch-baseline-browser-tests.log                     |
| Rebrand worktree `ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci --no-fund --no-audit` | Passed                      | Clean worktree dependency installation; no paid service |
| Rebrand `npm test`                                                                | 45 passed, 9 files          | waylatch-rebrand-local-tests.log                        |
| Rebrand `npm run build`                                                           | Passed                      | waylatch-rebrand-build.log                              |
| Rebrand `npm run test:e2e`                                                        | 8 passed                    | waylatch-rebrand-browser-tests.log                      |
| Rebrand `npm run test:ai`                                                         | Real CPU inference executed | waylatch-rebrand-ai.log, ai-benchmark.json              |
| Rebrand `npm run format:check`                                                    | Passed                      | Source formatting; generated evidence excluded          |

Five new unit/integration tests pin legacy IndexedDB/provenance, partial receiver replay, literal historical RL1 packets/corruption detection, historical event hashes, and new browser/PWA metadata. The metadata test failed before implementation, then passed. One new browser test loads historical storage and confirms Waylatch metadata/offline reload with cached PWA assets. A Node JSON-import error in that test harness was corrected; no test was removed.

Existing browser workflows still execute offline reload, QR image plus text transfer between disconnected contexts, malformed import rejection, human review/approval, real AI, claim approval, audit and mobile dialogs. axe reported zero violations on tested desktop/mobile Request, Review, claim Pay, Audit and mobile dialogs. This is automated evidence, not operational emergency certification.

## Simulations and remaining acceptance gates

Existing injected provider doubles and the separate-process HTTP PayPal simulator remain labeled local tests. They cover unauthorized purchase/capture, amount/revision tampering, idempotency, provider failures, signature rejection, webhook retry/deduplication and audit corruption. Simulated success cannot substitute for real Sandbox capture.

Missing runtime credentials, public HTTPS callback, official naming-search uncertainty, owner licensing/publication/video/legal/submission decisions are documented in BLOCKERS.md. Root license remains a proposal. No public release or final submission. $0 real money and no paid services activated.
