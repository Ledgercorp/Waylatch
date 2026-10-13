# RescueLedger implementation plan

Goal: runnable, reproducible Request → Review → Sandbox Pay → Audit product, plus disconnected handoff and real semantic review. Spec: ARCHITECTURE.md. Execution: autonomous native engineering with bounded independent offline and AI workstreams, as requested; no overlapping edits.

- [x] Qualification: inspect live rules/docs, exact CrisisCodec reference, runtime and credentials; record reuse and blockers.
- [x] Provider contracts: test Sandbox-only client, OAuth, Orders v2 idempotency and authoritative reconciliation; probe payouts once if credentials exist.
- [x] Foundation: strict procurement/claim schema, SQLite persistence, hash-chain validation, authenticated approval routes; test unauthorized capture and amount manipulation before implementing.
- [x] Offline: 600-byte packet limit, fragmented/revision-aware untrusted imports and persistent state; test interrupted/duplicate/corrupt transfers. Independently verify reference tests in a disposable copy.
- [x] AI: pinned local MiniLM weights, measured labeled benchmark, explainable pair review. Record model/license/hash/runtime and loading failure honestly.
- [x] Experience: responsive four-stage UI, IndexedDB outbox, service worker, QR image import, human review/confirmation and Sandbox return flow; browser acceptance and axe checks.
- [x] Hardening: retries, restart, auth/session/CSRF controls, webhook rejection, audit corruption and degraded connectivity. Review diff and rerun affected suites.
- [x] Release preparation: README, evidence, screenshots, reuse/license proposal, project description, 2:50 script/checklist, private Git milestone and confirmed remote commit.

Review focus: uncertain remote response must not enable a second purchase; revisions cannot inherit approval; offline replay cannot restore authority; malformed bounded QR cannot corrupt existing state; session/callback errors must not expose secrets or assert payment success.

## Pending external acceptance gates

- [ ] Execute genuine Sandbox Orders creation, browser approval and capture once credentials are securely bound.
- [ ] Probe actual Payouts entitlement once; implement reimbursement execution only if supported.
- [ ] Verify actual signed HTTPS webhook receipt if infrastructure is available.
- [ ] Obtain an authorized private Git remote and confirm synchronized commit.
- [ ] Owner licensing/publication/video/legal/submission approval and execution.
