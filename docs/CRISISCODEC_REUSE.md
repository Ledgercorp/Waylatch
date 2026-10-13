# CrisisCodec reuse ledger

Owner authorized selective private adaptation from Ledgercorp/CrisisCodec, feat/crisiscodec-mvp, commit 8ca845cb19a5cdd29897171c61b1ec95b5c1ba7f. Reference checkout is read only. No UI or disaster-domain logic is copied.

Candidate primitives: src/core/codec.ts CRC32, MessagePack bounded decoding, envelope fragmentation, text transport; src/core/reconstruction.ts duplicate fingerprint, bounded state, revision conflict rejection and coverage. RescueLedger uses a new RL1 procurement envelope, lower QR budget, explicit unknown fields, independently reviewed imported records and no payment authority in packets. Exact final adapted files and independently executed tests recorded after implementation.

Source has no adopted root license; docs/LICENSE-MIT-PROPOSAL.txt explicitly is not a license. Private adaptation is authorized by owner. Owner must confirm rights and approve release license before public publication. Third-party dependency licenses remain separate.
