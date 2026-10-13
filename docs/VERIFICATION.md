# Verification ledger

Date: 2026-10-13. Logs, screenshot artifacts, calibration measurements and source fingerprints are in docs/evidence/. Categories below are intentionally separate.

## 1. Executed real integrations

- **Real local AI inference:** `npm run test:ai` executed pinned MiniLM q8 weights on Linux x64 CPU, remote model access disabled, 384-dimensional embeddings. Synthetic calibration: TP5/FP0/FN1/TN6, threshold .60; not a held-out accuracy estimate. Latest loading/runtime/memory measurements, every pair score and SHA-256 asset hashes are in `ai-benchmark.json`. Browser test also executed the app's real authenticated semantic-review endpoint and displayed its evidence.
- **GitHub read:** authenticated reference access at exact 8ca845cb19a5cdd29897171c61b1ec95b5c1ba7f. Original clean. Creation of a private RescueLedger repository was rejected by integration permission; no remote synchronization.
- **No real PayPal account operation, Payouts entitlement result or real signed webhook callback executed.**

## 2. Executed local/integration tests

| Command                                        | Result                 | Evidence / practical scope                                                                                                                                                                                                                            |
| ---------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                     | 40 passed, 8 files     | `local-tests.log`: schemas, unknown fields, offline receiver/storage, receipts, review signals, auth, amount/revision freeze, audit corruption, concurrency, interrupted create/capture, restart, bounded malformed input and webhook retries         |
| `npm run build`                                | Passed                 | `build.log`: TypeScript + production Vite bundle. Upstream Zod annotation and >500KB bundle advisory only                                                                                                                                             |
| `npm run test:e2e`                             | 7 passed               | `browser-tests.log`: actual offline preservation/reload, QR image plus packet text between disconnected contexts, corrupted import, explicit human review/approval, visibly blocked payments, real AI, separate claim approval, audit, mobile dialogs |
| `npm run format:check`                         | Passed                 | `format-check.log`; generated evidence excluded from source formatting checks                                                                                                                                                                         |
| `npm run release:check`                        | Passed · zero findings | Bounded configured-secret/credential-pattern/frontend provider-code scan, not a comprehensive security certification                                                                                                                                  |
| CrisisCodec disposable copy `npm test`         | 38 passed              | `crisiscodec-unit.log`, exact commit and file hashes in `crisiscodec-reference.json`                                                                                                                                                                  |
| CrisisCodec disposable copy `npm run test:e2e` | 7 passed               | `crisiscodec-browser.log`; original reference checkout untouched                                                                                                                                                                                      |

axe found **zero violations** on tested Request desktop/mobile, Review, claim Pay, Audit and mobile capture/QR/receiver dialogs. These checks do not constitute manual assistive-technology or operational certification. Screenshots depict real running synthetic fixtures, not fabricated payment outcomes.

Four substantiated defects were corrected with red/green regression evidence: rolling capture retry expiry; signed webhook redelivery discarded after inspection failure; malformed JSON mislabeled as provider failure; malformed certificate URL threw instead of cleanly rejecting. Existing auth and financial controls remained enforced.

## 3. Simulated behavior

- Separate-process HTTP PayPal simulator: four tests exercise real HTTP OAuth/Orders/capture/verification contracts. Simulator records amounts, request IDs and logical order/capture counts. Healthy path and dropped successful responses yielded one logical order and one capture. This verifies software contract/recovery, **not actual PayPal account behavior**.
- Additional injected provider doubles test authoritative amount mismatch, Sandbox-only transport, invalid signatures and signed-event retries. A verified webhook **double** is not a real PayPal signature result.
- Playwright simulates network disconnection. Request saving, IndexedDB reload, generated QR scanning and reconstruction execute in real browser contexts.
- All examples and benchmark labels are synthetic. No real emergency, claimant, vendor, receipt or inventory outcome is represented.

## 4. Unverified requirements

Actual Sandbox order create/buyer approval/capture; real public HTTPS signature-verified webhook receipt; Payouts entitlement and reimbursement execution; public repository/license adoption; public YouTube video; owner eligibility/registration/legal consent and final Devpost submission. The project is **not submission-complete**.

No hosted demo was deployed. Repository execution remains the chosen permitted route. Clean source at commit 407122d was unpacked with `git archive HEAD`, then `ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci --no-fund --no-audit`, `npm test` (40 passed), `npm run build`, `npm run model:download` (all seven pinned assets downloaded and verified), `npm run test:ai` (actual inference), and `npm run test:e2e` (7 passed) executed successfully. The release checker initially failed without `.git`; the corrected checker was copied into that source copy and its archive-mode scan plus source format check passed. `clean-*.log` and `ai-clean-reproduction.json` retain evidence. No blanket claim of production/emergency readiness.

## 5. Blockers

- Missing securely bound PayPal Sandbox client ID/secret/webhook ID. `npm run paypal:probe` reports BLOCKED_CREDENTIALS_MISSING, exit2, no provider transaction.
- GitHub integration cannot create private repositories (`Resource not accessible by integration`). No remote was silently substituted; local branch/source archive/Git bundle preserve progress.
- Public HTTPS callback unavailable; actual callback verification remains unexecuted.
- Owner approval required for root license, public visibility, public video and final submission. Prepared drafts are reviewable; no approval implied.

Financial usage: $0 real-money project charges; no funds transferred, paid service activated, card added, hosting purchased or external paid inference used. Work used the supplied Codex Cloud runtime, free packages/model downloads and localhost tests. No Mac dependence.
