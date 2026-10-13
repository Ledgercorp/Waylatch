# Current execution verification — private candidate, 2026-10-13

Fresh results below supersede earlier current-count prose. Historical logs/reports remain retained after this section; they are not repeated as newly executed evidence.

| Command                                                        | Result                                                                             | Evidence                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci --no-fund --no-audit | Passed, CPU-only clean dependency installation                                     | release-candidate-install.log                             |
| npm test                                                       | **59 passed,12 files**, zero final failures                                        | release-candidate-unit.log                                |
| npm run build                                                  | Passed TypeScript and production Vite build                                        | release-candidate-build.log                               |
| npm run test:e2e                                               | **9 passed**, zero final failures (37.6seconds)                                    | release-candidate-browser.log                             |
| npm run test:ai                                                | Real local q8 CPU embeddings executed; TP5 FP0 FN1 TN6 on12 calibration pairs      | release-candidate-ai.log / ai-benchmark.json              |
| npm run demo:record / npm run demo:render                      | Actual browser recording and captioned110.04s H.264 MP4 generated; no PayPal calls | demo-recording.log / demo-rendering.log / demo-video.json |
| npm run audit:validate -- docs/evidence/demo-audit.json        | Passed, valid:true,count8                                                          | demo-audit-validation.log                                 |
| npm run paypal:auth                                            | Exit2,SANDBOX_CREDENTIALS_MISSING,requestExecuted:false,status:null                | paypal-oauth.json                                         |
| npm run paypal:integration                                     | Exit2 before requests/operator prompts: credentials unavailable                    | integration blocker; no order evidence                    |

## Executed real integrations

Actual local Transformer/ONNX inference and actual GitHub synchronization are independently evidenced. PayPal Sandbox OAuth, order creation, buyer approval, capture, official signature-verification call, real callback and payout are **not executed**. An unauthenticated Sandbox-host root response403 only establishes reachability. Runtime variables/bindings and external connector outcomes are in cloud-runtime.json,release-external-checks.json,submission-access.json.

## Executed local/browser tests

59 local tests include historical RL1/IndexedDB/audit compatibility, request/claim validation, semantic scoring and asset corruption, backend review/amount/authorization boundaries, concurrent/restarted payment operations, stable request IDs, uncertain-result recovery, invalid webhook handling/deduplication/retry and nine callback gateway cases. Gateway upstreams and PayPal responses are local fixtures.

Browser coverage includes real IndexedDB offline reload, actual QR image decode between contexts, fragment reconstruction/corruption, desktop1440px/mobile390px layout and axe scans, legacy IDB/PWA metadata, actual local AI review, independent claim review and honest missing-credentials UI. Axe returns zero violations in inspected states; this is not universal assistive-technology certification. The new test applies150ms/64KiB/s Chromium throttling then real browser-offline state, and verifies reconnection preserves local data while server records/payments/events remain unchanged. Its initial test-harness failures are retained and explained: CDP and Playwright emulation controllers conflicted, then a snapshot preceded completed sign-in. Assertions now wait for confirmed sign-in and validate response status.

## Simulated behavior

Payment/provider HTTP fixtures, injected timeouts/declines, OAuth transport doubles, webhook fixtures and automated review/authorization notes are simulations. Network failures/throttling are browser emulation. None prove actual provider acceptance, human decision-making or emergency field performance. The preview always states FICTIONAL DATA / AUTOMATED UI FIXTURES / NO PAYPAL TRANSACTION.

## Unverified/blockers

Actual financial integration/capture and callback remain blocked by environment credentials/connectivity. Sandbox buyer authentication needs a secure authorized identity and human approval. Payouts entitlement unknown; transfer unimplemented. Devpost registration/custom fields unavailable from failed read tools. Final public YouTube asset, source/license/publication and legal submission approvals pending. Naming remains AMBER.

## Release audit

All382 lockfile entries have declared licenses;312 installed packages and native libvips subcomponents inspected. Not all optional-platform license texts were downloaded. MIT root proposal is conditional and does not override LGPL/MPL/CC-BY or third-party terms. Git-history specific-pattern scan covered226 baseline blobs with zero findings; it is not comprehensive secret clearance. Final index/frontend release-check result and final browser/format results are recorded in the checkpoint below.

---

## Earlier execution evidence (historical)

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

Three additional OAuth transport-double tests verify missing bindings, sanitized success without tokens, and HTTP401 classification. Two process-boundary CLI tests reproduce and protect explicit review/authorization cancellation. The CLI no longer invents human review before confirmation. Real OAuth execution remains blocked by missing bindings, as recorded in paypal-oauth.json.

## Fresh private-GitHub clean clone

A clean clone of default main at **ede567797bccf059d3754b22792c8cfdde62bb8b** executed `ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci --no-fund --no-audit`, `npm test` (50 passed, 11 files), `npm run build` (passed), `npm run test:e2e` (eight passed, including actual local AI), and `npm run release:check` (zero findings). Already verified model assets were copied into the ignored cache and `npm run model:download` independently checked all seven pinned hashes; this is cache validation, not another fresh network download. Logs: waylatch-clean-*.log.

Private main and feat/waylatch-rebrand read back the same committed code SHA. API inspection confirmed remote package name waylatch/private=true and the OAuth command. Original feat/rescueledger-mvp is preserved at ee1488b. Final documentary checkpoint refs are verified separately after push.

## Final candidate checkpoint checks

Final `npm run test:e2e`: **9 passed**, zero failures,37.6seconds. The constrained-network cold load was9214ms at150ms simulated latency,64KiB/s download and16KiB/s upload. Offline reload preserved the request; reconnection produced zero automatic record submissions, financial operations or audit changes. These are Chromium emulation measurements only.

`npm run release:check` passed with zero findings across the staged release index and frontend. `npm run format:check` passed. Independent `audit:validate` returned valid:true,count8 for the preview export. All temporary recorder/backend/gateway processes were closed; no public tunnel is running. The only build warning is a537.54kB uncompressed JavaScript chunk (173.03kB gzip estimate). The offline shell deliberately preloads the complete core; code splitting is deferred because it would need careful offline asset precaching. The measured constrained-network run completes; no mobile-network performance claim is made.
