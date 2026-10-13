# Genuine PayPal Sandbox purchase completed — 2026-10-13

Resumed the existing private checkout at `5ca7ce805597a46570aab250e350ba37052d6313`. Read-only git ls-remote confirmed GitHub HEAD, main and feat/waylatch-release-candidate at that commit. Application/payment source and PayPal credentials are unchanged.

## Actual provider result

- Order: **2W330508JA572391V**.
- Capture: **8WY07860808872629**.
- PayPal authoritative order status: **COMPLETED**.
- Waylatch payment state: **PAID**.
- Exact amount: **USD 1.00 simulated Sandbox funds**.
- Real funds/services spent: **USD 0.00**.

[Sanitized genuine capture evidence](evidence/paypal-real-sandbox.json) retains provider references, exact amount, human-decision provenance, timestamps, isolation and cleanup. It contains no access token, passphrase or raw provider account data.

## Credentials and OAuth

PAYPAL_CLIENT_ID and PAYPAL_SECRET_KEY were present and nonempty; PAYPAL_CLIENT_SECRET was absent. The existing server-only alias resolver supplied the configured values without renaming, replacing, persisting or displaying them. Runtime metadata now had a source association, though its readiness labels remained unknown; actual authentication supplied operational proof.

`npm run paypal:auth` exited 0. At 2026-10-13T20:17:48.443Z the existing proxy-aware client made the real Sandbox POST /v1/oauth2/token, received HTTP 200 and an access token. Only accessTokenReceived=true was saved in [OAuth evidence](evidence/paypal-oauth.json). Earlier missing-PayPal-configuration reports are superseded for this runtime.

The fresh workspace lacked node_modules. npm ci --ignore-scripts --no-audit --no-fund restored 312 locked packages with install hooks disabled. No project build, upgrade, model download or completed unit/browser/AI/payment simulation suite was repeated. No native inference verification is claimed.

## Real human approval sequence

The existing RequestSchema validated request **RL-REAL-20261013-201748**, revision **1**: fictional incident FLOOD-EMBER-26, fictional Ember shelter/Field team Delta, one fictional test item, quantity 1, exact USD 1.00. The user explicitly replied **REVIEW and AUTHORIZE** for that concrete record and amount. Normal authenticated request/review/approve endpoints recorded those real decisions. No provider double or automated human decision was substituted.

The existing Payments code created the actual Sandbox order. Initial authoritative status was PAYER_ACTION_REQUIRED, unpaid. On resume the same database/order were retained; no new order or decision was created.

The user hit Pay in the genuine Sandbox buyer checkout and then received Safari's cannot-connect page at 127.0.0.1. Loopback points to the buyer's phone rather than the cloud demo server. Resumed authoritative PayPal inspection confirmed **APPROVED**, proving buyer approval independently of the failed return page. [Buyer evidence](evidence/paypal-buyer-approval.json) retains that pre-capture diagnostic; its uncaptured status is historical.

The user separately replied **CAPTURE — simulated funds only** for the displayed order, record/revision and exact amount. Only then did the agent send CAPTURE to the task-local helper. The existing server fetched the authoritative order, checked APPROVED status/reference/USD amount, captured with the persisted stable request ID, then fetched and reconciled COMPLETED status and the single final matching capture. A further application inspection confirmed PAID/COMPLETED. The failed mobile return page was not repaired or presented as working.

## Isolation, audit and cleanup

The existing production coordinator password was unnecessary for a separate instance: createApp accepts its own passphrase and Store accepts its explicit database path. The user authorized this isolation. A 48-byte random temporary passphrase lived only in process memory; it was never displayed, sent, committed or written to a credential file. Normal /api/session authentication and financial gates remained in force. The original default database, existing records/accounts and PayPal credentials were untouched.

The loopback-only API used a dynamic local port and **data/paypal-demo/RL-REAL-20261013-201748.sqlite**. No backend was exposed publicly. [Exported audit](evidence/paypal-sandbox-audit.json) contains seven hash-linked events: request creation, actual human review, purchase authorization, order reservation, real order creation, authoritative buyer approval observation and completed capture. Independent [validation](evidence/paypal-sandbox-audit-validation.json) confirms the exported chain, exact match to persisted events and matching capture/order/amount references.

Fresh persisted counts are one request, one payment, seven events and zero coordinator sessions. PAID state and capture ID remain stored. [Cleanup evidence](evidence/paypal-sandbox-resume.json) records the database SHA-256. The loopback instance stopped normally, the coordinator session was revoked, and the temporary passphrase was discarded with its process. No background payment process remains.

The ignored task-local helper .cache/paypal-human-demo.mts supports --resume, validates the preserved approved record/order/amount and never creates another order on resume. There is no need to repeat the completed capture. Preserve the isolated database and evidence. In a fresh checkout without the database, reconcile the known order through PayPal before any new operation.

## Remaining independent work

PAYPAL_WEBHOOK_ID remains absent. Actual webhook subscription/signature delivery and Payouts remain unverified. Fresh read-only registration/event checks and isolated rejection results are in WEBHOOK_RELEASE_STATUS.md. No callback endpoint, payout probe, paid resource, public release or submission was provisioned. The existing110.04-second demo now includes authentic settled PAID UI and seven-event audit footage, plus selected independent provider evidence; original nonfinancial fixtures remain labeled. Public/license/source-rights/legal/submission decisions remain with the owner.

The demonstrated genuine purchasing flow is complete. All real spending remains **$0**.

## Private release followup

Independent Orders/Capture GETs returned HTTP200/COMPLETED with exact references/amount; evidence/paypal-independent-verification.json. Actual settled browser status/audit-export checks passed without financial mutations; evidence/settled-demo-recording.json. The judge CLI accepts the saved audit envelope and validates events rather than claimed metadata. Final checkpoint, video hash, scoped release checks and the consolidated proposal: RELEASE_CANDIDATE_REPORT.md and RELEASE_APPROVALS.md.
