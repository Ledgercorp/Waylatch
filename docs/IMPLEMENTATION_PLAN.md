# RescueLedger implementation plan

Goal: runnable, reproducible Request → Review → Sandbox Pay → Audit product, plus disconnected handoff and real semantic review. Spec: ARCHITECTURE.md. Execution: autonomous native engineering with bounded independent offline and AI workstreams, as requested; no overlapping edits.

- [ ] Qualification: inspect live rules/docs, exact CrisisCodec reference, runtime and credentials; record reuse and blockers.
- [ ] Provider contracts: test Sandbox-only client, OAuth, Orders v2 idempotency and authoritative reconciliation; probe payouts once if credentials exist.
- [ ] Foundation: strict procurement/claim schema, SQLite persistence, hash-chain validation, authenticated approval routes; test unauthorized capture and amount manipulation before implementing.
- [ ] Offline: 600-byte packet limit, fragmented/revision-aware untrusted imports and persistent state; test interrupted/duplicate/corrupt transfers. Independently verify reference tests in a disposable copy.
- [ ] AI: pinned local MiniLM weights, measured labeled benchmark, explainable pair review. Record model/license/hash/runtime and loading failure honestly.
- [ ] Experience: responsive four-stage UI, IndexedDB outbox, service worker, QR image import, human review/confirmation and Sandbox return flow; browser acceptance and axe checks.
- [ ] Hardening: retries, restart, auth/session/CSRF controls, webhook rejection, audit corruption and degraded connectivity. Review diff and rerun affected suites.
- [ ] Release preparation: README, evidence, screenshots, reuse/license proposal, project description, 2:50 script/checklist, private Git milestone and confirmed remote commit.

Review focus: uncertain remote response must not enable a second purchase; revisions cannot inherit approval; offline replay cannot restore authority; malformed bounded QR cannot corrupt existing state; session/callback errors must not expose secrets or assert payment success.
