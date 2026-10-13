# CrisisCodec reuse ledger

Owner authorized selective private adaptation from Ledgercorp/CrisisCodec, feat/crisiscodec-mvp, commit 8ca845cb19a5cdd29897171c61b1ec95b5c1ba7f. Reference checkout is read only. No UI or disaster-domain logic is copied.

Candidate primitives: src/core/codec.ts CRC32, MessagePack bounded decoding, envelope fragmentation, text transport; src/core/reconstruction.ts duplicate fingerprint, bounded state, revision conflict rejection and coverage. RescueLedger uses a new RL1 procurement envelope, lower QR budget, explicit unknown fields, independently reviewed imported records and no payment authority in packets. Exact final adapted files and independently executed tests recorded after implementation.

## Current ownership correction — 2026-10-13

The owner confirms that CrisisCodec is their unfinished project under Colby Weiss / LeftSock Labs, with the same ownership as Waylatch. Selective packet/reconstruction reuse is owner-controlled internal reuse. Its missing adopted MIT license does not block authorized internal development or require a commercial license from an outside company. The earlier blanket requirement to reconfirm CrisisCodec public rights is superseded by this correction and the scoped evidence below; the original selective-adaptation history remains recorded here.

Read-only GitHub inspection at the exact reference commit found two commits affecting each reused file: root commit `af53e58aa9a011b8392f0721568297b40d3630d9` adds both files, and `e0587e4dee1b7cac441105e03596190298d36cba` modifies them. Both record Colby Weiss as author and committer. All four reachable commits use that identity, with no coauthor trailers. The complete source and affected patches contain no independently owned contributor attribution; npm dependencies are imported separately. Fetched UTF-8 file SHA-256 values match [crisiscodec-reference.json](evidence/crisiscodec-reference.json). Recorded queries, source fingerprints, scope and limits are in [owner-source-provenance.json](evidence/owner-source-provenance.json).

This supports the owner's account and reveals no independent contributor in these two primitives. Git author metadata is unsigned, with no linked GitHub author identity, and does not prove copyright title or exclude unrecorded/copied contributions. The remaining rights question is limited to whether any independently owned material outside the observed history was incorporated into these specific files; if identified, review that material and its permission. This is not a blanket licensing block on internal work.

The source still has no adopted root license; `docs/LICENSE-MIT-PROPOSAL.txt` explicitly is a proposal. Adoption of Waylatch's application MIT license, final attribution and any public release remain separate owner decisions. Third-party npm, model and native-library licenses remain separate and unchanged. This correction authorizes no license adoption, public action or spending.

## Final adapted components

- `src/core/codec.ts` → `src/offline/codec.ts`: CRC32 computation, MessagePack envelope, bounded decode, conservative fragment envelope overhead, base64 text wrapping. New RL1 prefix, 600-byte maximum, procurement field manifest, request IDs/revision and no human-confirmation or payment authority encoded.
- `src/core/reconstruction.ts` → `src/offline/reconstruction.ts`: duplicate fingerprints, fragment joining, bounded state, equal-revision conflicts and delivered/missing coverage. Higher revision clears older assemblies, stale revisions reject, each field validates against RescueLedger schema and complete imports require cross-field validation. No incident fact priorities, domain schema or manifest confirmation inherited.
- `src/offline/storage.ts`, `qr.ts`: new RescueLedger persistence/provenance and QR image interfaces using existing free idb/qrcode/jsQR libraries. Receiver is persisted as validated packet envelopes and replayed through validation, not trusted serialized authority.
- No CrisisCodec UI, visual assets, fonts, network-lab behavior, emergency incident schema or application server copied.

Independently executed reference verification in `/workspace/crisiscodec-verification`, a disposable copy: `npm ci --ignore-scripts --no-audit --no-fund`, `npm test` (38/38), `npm run test:e2e` (7/7). Exact original commit and source/test/lockfile SHA-256 fingerprints in `docs/evidence/crisiscodec-reference.json`; logs `crisiscodec-unit.log` and `crisiscodec-browser.log`. Original reference `git status --short` remained empty. Reported historical tests were not trusted without execution.

RescueLedger new work during submission period includes procurement/claims, coordinator authorization, SQLite payment reservation and state machine, official PayPal Sandbox client, independent chain validation, pinned real semantic review/benchmark, responsive four-stage interface and protocol failure tests. Source history begins October 13, 2026. No public release or license adoption yet.

Current product identity: Waylatch, formerly RescueLedger. The historical RescueLedger implementation and reuse statements above remain unchanged as provenance. The rebrand adds no CrisisCodec reuse and does not modify the reference repository.
