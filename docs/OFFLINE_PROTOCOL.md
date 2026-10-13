# RescueLedger disconnected handoff protocol (RL1)

This prototype carries **untrusted request data**, never approval or payment authority. It uses fictional demonstration records. It has not been tested in real emergencies.

## Source adaptation

The CRC32 loop, MessagePack envelope arrangement, conservative fragment sizing, Base64 text envelope, and field-wise assembly pattern were selectively adapted from CrisisCodec `src/core/codec.ts` and `src/core/reconstruction.ts`, verified reference commit `8ca845cb19a5cdd29897171c61b1ec95b5c1ba7f`. Original files remained untouched. The CrisisCodec application, extraction, transport relay, UI, operational incident facts, and human-confirmation metadata were not copied.

RescueLedger replaces the CC1 domain with RL1 and structured procurement/claim fields. It uses a fixed manifest, a strict 600-byte raw packet ceiling, a 64-fragment per-field ceiling, bounded receiver memory, strict field schemas, and full revision replacement rather than CrisisCodec's delta field revisions. IndexedDB persistence and QR image helpers are newly implemented for RescueLedger using `idb`, `qrcode`, and `jsqr`.

The reference repository contains a proposed MIT license (`docs/LICENSE-MIT-PROPOSAL.txt`) but no active root license. The owner expressly authorized selective internal adaptation. Public release of this derivative remains subject to the owner's source-license decision and hackathon reuse rules. No license is silently assigned here.

## Wire format

Each raw packet is a MessagePack array followed by a four-byte big-endian CRC32 of the MessagePack body:

`[1, requestId, revision, fieldIndex, partIndex, totalParts, payloadBytes, span] + crc32`

Field zero is the delivery manifest. Other indices follow the fixed exported `FIELDS` array: kind, incident, resources, urgency, amountCents, amountKind, currency, location, origin, createdAt, receiptDigest, transactionReference, expenseAt. The manifest contains this exact list. IDs and revisions are shared envelope metadata. Each field value is encoded independently with sorted object keys and fragmented into packets of at most the requested budget (128–600 raw bytes). All fragments except the final one have exactly `span` payload bytes. Text and QR transport use `RL1:` followed by Base64; at most 804 text characters.

The QR PNG helper uses actual QR encoding and medium error correction. Image import is local to the browser, limited to 5 MB and 16 million pixels. Manual text import supports devices without image scanning. The application shell must already be cached before a completely offline device can open it; first visits need connectivity.

## Receiver behavior

- Decode checks size, CRC32, envelope values, fragment position, bounded strings and arrays, and the exact manifest. Reassembled values are validated with the shared request field schemas; complete requests are validated again including cross-field amount consistency.
- Out-of-order fragments are supported. Missing fields remain visible, including when most fragments of a field have arrived. Explicit nulls and `unknown` values are distinguished from absent packets; unknown resource quantities are identified by index.
- Exact duplicates increment the duplicate counter without duplicating field state. Conflicting equal-revision packets, fragment counts, or decoded field values reject without changing the prior receiver.
- A higher revision starts a clean receiver for the same request; fields from an earlier revision never fill gaps in the new revision. Earlier revision packets reject. A different request ID requires explicitly resetting the receiver. Revisions are snapshots, not deltas.
- One receiver session holds one request, with at most 64 assemblies, 1,024 unique packets, 256 KiB retained raw packet bytes, and 32 KiB per field. Exceeding a bound rejects the packet.
- Receiver persistence stores raw packets and reconstructs them through all checks on reload rather than trusting cached decoded facts. IndexedDB stores local requests and pending outbox entries with source, timestamp, origin label, and whether the import is untrusted. Equal-revision record conflicts and stale replacements reject. These records are local preservation, not an authoritative payment ledger.

CRC32 detects accidental corruption. It **does not authenticate a sender**, prevent deliberate forgery, or establish authorization. Origin labels are claimed by the sender. A packet can be recomputed by an attacker; server authentication, strict validation, and human review remain mandatory. No receiving, saving, scanning, or reconnecting operation executes a financial request.

## Interfaces

`src/offline/index.ts` exports:

| Function                                                                     | Purpose                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| `buildPackets(request, budget=600)`                                          | Returns raw `Uint8Array[]`                           |
| `toText(bytes)` / `fromText(text)`                                           | Validated RL1 text transport                         |
| `emptyReceiver()` / `receive(state, bytes)`                                  | Pure receiver transition                             |
| `coverage(state)`                                                            | Complete, missing, unknown, partial fields, counters |
| `reconstructedRequest(state)`                                                | Strict complete-request validation                   |
| `saveRequest(request, source='local')`                                       | Durable local request with provenance                |
| `getRequests()` / `getOutbox()`                                              | Requests or provenance-bearing pending entries       |
| `saveReceiver(state, session='default')` / `loadReceiver(session='default')` | Durable receiver sessions                            |
| `packetQrDataUri(bytes)`                                                     | Promise of QR PNG data URI                           |
| `decodeQrImage(file: Blob)`                                                  | Promise of scanned, validated raw packet             |

## Verification

Run `npx vitest run tests/offline.test.ts` in RescueLedger. This exercises interrupted/out-of-order fragment delivery, exact duplicates, corruption, raw bounds, conflicting/stale revisions, explicit unknown values, strict-schema transport, IndexedDB persistence with `fake-indexeddb`, and actual QR PNG generation. These are local tests, not PayPal integrations. Browser offline reload and QR image transfer need their separate end-to-end browser evidence.

CrisisCodec's unmodified reference source was independently tested from a disposable copy at `/workspace/crisiscodec-verification` with `npm ci --ignore-scripts --no-audit --no-fund`; its exact test evidence is preserved in `docs/evidence/crisiscodec-unit.log` and `docs/evidence/crisiscodec-browser.log`. Those baseline results establish reusable source behavior, not RescueLedger behavior.
