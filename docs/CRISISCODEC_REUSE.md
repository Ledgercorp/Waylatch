# CrisisCodec reuse ledger

Owner authorized selective private adaptation from Ledgercorp/CrisisCodec, feat/crisiscodec-mvp, commit 8ca845cb19a5cdd29897171c61b1ec95b5c1ba7f. Reference checkout is read only. No UI or disaster-domain logic is copied.

Candidate primitives: src/core/codec.ts CRC32, MessagePack bounded decoding, envelope fragmentation, text transport; src/core/reconstruction.ts duplicate fingerprint, bounded state, revision conflict rejection and coverage. RescueLedger uses a new RL1 procurement envelope, lower QR budget, explicit unknown fields, independently reviewed imported records and no payment authority in packets. Exact final adapted files and independently executed tests recorded after implementation.

Source has no adopted root license; docs/LICENSE-MIT-PROPOSAL.txt explicitly is not a license. Private adaptation is authorized by owner. Owner must confirm rights and approve release license before public publication. Third-party dependency licenses remain separate.

## Final adapted components

- `src/core/codec.ts` → `src/offline/codec.ts`: CRC32 computation, MessagePack envelope, bounded decode, conservative fragment envelope overhead, base64 text wrapping. New RL1 prefix, 600-byte maximum, procurement field manifest, request IDs/revision and no human-confirmation or payment authority encoded.
- `src/core/reconstruction.ts` → `src/offline/reconstruction.ts`: duplicate fingerprints, fragment joining, bounded state, equal-revision conflicts and delivered/missing coverage. Higher revision clears older assemblies, stale revisions reject, each field validates against RescueLedger schema and complete imports require cross-field validation. No incident fact priorities, domain schema or manifest confirmation inherited.
- `src/offline/storage.ts`, `qr.ts`: new RescueLedger persistence/provenance and QR image interfaces using existing free idb/qrcode/jsQR libraries. Receiver is persisted as validated packet envelopes and replayed through validation, not trusted serialized authority.
- No CrisisCodec UI, visual assets, fonts, network-lab behavior, emergency incident schema or application server copied.

Independently executed reference verification in `/workspace/crisiscodec-verification`, a disposable copy: `npm ci --ignore-scripts --no-audit --no-fund`, `npm test` (38/38), `npm run test:e2e` (7/7). Exact original commit and source/test/lockfile SHA-256 fingerprints in `docs/evidence/crisiscodec-reference.json`; logs `crisiscodec-unit.log` and `crisiscodec-browser.log`. Original reference `git status --short` remained empty. Reported historical tests were not trusted without execution.

RescueLedger new work during submission period includes procurement/claims, coordinator authorization, SQLite payment reservation and state machine, official PayPal Sandbox client, independent chain validation, pinned real semantic review/benchmark, responsive four-stage interface and protocol failure tests. Source history begins October 13, 2026. No public release or license adoption yet.
