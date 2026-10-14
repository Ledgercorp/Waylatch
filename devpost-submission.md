# Waylatch — private final submission draft

## Inspiration

A field team can lose connectivity while a coordinator still needs to understand what was requested, what evidence exists and who can authorize the purchase. Waylatch keeps those steps connected: preserve the need offline, carry it by QR, compare the records, retain human payment authority and inspect the resulting history.

Built by Colby Weiss / LeftSock Labs. This is a fictional emergency-procurement prototype, not a field-tested emergency system. No lending, autonomous spending or real-money transaction is demonstrated.

## What it does

A request survives browser refresh in IndexedDB, even while disconnected. Bounded QR packets reconstruct it in another browser profile. Interrupted, repeated and conflicting packets keep explicit states; receiving a request gives it no payment authority. Reconnection alone neither submits a request nor spends money.

After explicit submission, a coordinator compares records side by side. Local MiniLM retrieves related wording and displays semantic cosine alongside recorded receipt/reference, amount, incident, location and time context. Contradictions and missing facts stay visible. Ranked/grouped summaries preserve access to informational candidates; revision-aware unrelated dismissals reduce repeated presentation without erasing evidence. Related/unrelated/investigate notes remain advisory. Matching facts, even in the explicitly unvalidated strong tier, are not proof of the same purchase.

Authenticated server gates keep human REVIEW and AUTHORIZE separate from buyer approval and CAPTURE. Official PayPal Sandbox Orders v2, durable reservations, idempotency keys and reconciliation connect an approved request revision and exact amount to a completed capture. Claims have a separate review path; reimbursement transfer is unimplemented.

The Proof Trail distinguishes browser observations, server audit events and saved provider inspection. It shows missing events rather than inventing them. A sanitized report supports reading/sharing; a separate original organization-chain export preserves the actual SHA-256 preimages for independent validation. Administrators can rewrite a complete chain; it is neither immutable nor blockchain-backed.

## Genuine historical PayPal evidence

Request RL-REAL-20261013-201748 revision 1, order **2W330508JA572391V**, capture **8WY07860808872629**: **USD 1.00 simulated Sandbox funds, COMPLETED / PAID, $0 real spending**. Actual human REVIEW/AUTHORIZE, genuine buyer approval and separate human CAPTURE preceded settlement. Saved independent provider inspection confirms the exact references and amount; the original seven-event chain validates.

The judge walkthrough and video show this as a separate read-only historical archive. They do not reenact checkout or imply that buyer approval was screen-recorded. New fictional requests inherit no historical payment claim. The original buyer's loopback return failed; authoritative inspection established approval. No additional purchase is required to judge Waylatch. [Original evidence](https://github.com/Ledgercorp/Waylatch/blob/feat/waylatch-competitive/docs/evidence/paypal-real-sandbox.json), [independent inspection](https://github.com/Ledgercorp/Waylatch/blob/feat/waylatch-competitive/docs/evidence/paypal-independent-verification.json).

## AI: useful comparison context, unproven detection

The unchanged Apache-2.0 Xenova/all-MiniLM-L6-v2 model executes genuine q8 CPU inference on the local Node server through Transformers.js/ONNX. Descriptions do not go to a paid inference service; the browser/phone does not execute embeddings. High cosine describes wording, not transaction identity or fraud probability. Structured recorded facts govern advisory attention tiers.

Both completed scientific evaluations remain unchanged and unfavorable. The original combined review flagged 70 of 72 labeled distinct held-out pairs. On a genuinely new frozen test with two blinded nonexpert AI judgments per case, revised attention reduced FP77→30, but precision worsened .384→.250, recall .889→.185, F1 .536→.213 and fixed-budget duplicate retrieval 6→4. Predefined targets failed. Zero strong alerts gives undefined strong precision. These are synthetic scenarios, not expert-human or field truth; no improved detection, ranking, human time savings or operational reliability is claimed. Missing supplier/line-allocation/fulfillment facts cannot be recovered from text. [Full scientific evidence and both receipts](https://github.com/Ledgercorp/Waylatch/blob/feat/waylatch-competitive/docs/AI_REVIEW_QUALITY_V2.md).

## How we built it

React, TypeScript and Vite preserve the existing Request → Review → Pay → Audit → Proof Trail interface. IndexedDB and a service worker provide local continuity. Zod and bounded MessagePack/CRC32 packets treat imports as untrusted. Node 24, Express and SQLite preserve requests, review decisions, financial reservations and audit history. Official PayPal Sandbox Orders v2 is central to the accountable-payment workflow. MiniLM supplies local language retrieval; it never grants financial authority.

Waylatch retains RescueLedger ancestry and legacy storage/QR compatibility. CrisisCodec is the same owner's unfinished project; limited owner-controlled packet/reconstruction reuse is disclosed in [source provenance](https://github.com/Ledgercorp/Waylatch/blob/feat/waylatch-competitive/docs/CRISISCODEC_REUSE.md). Third-party notices remain applicable, and the root source license is still an owner decision.

## Try it safely

With Node 24+, npm, Python 3 and Chromium, run **`npm run judge`**. No merchant secrets or existing coordinator password are required. The bootstrap installs/builds when needed and verifies the pinned model. Use normal upstream acquisition or the exact verified local-bundle layout in [JUDGE_QUICKSTART.md](https://github.com/Ledgercorp/Waylatch/blob/feat/waylatch-competitive/docs/JUDGE_QUICKSTART.md). Source-only Git does not contain model weights. Current acceptance tested clean installation with the owner's separately supplied verified bundle, not a fresh upstream download from the restricted cloud worker.

Follow the on-screen guide: fictional offline request → reload → QR reconstruction → explicit submission → real local semantic comparison → human authority boundaries → separate historical capture/Proof Trail → original-chain export. Judge mode blocks financial approvals and every provider operation. Ctrl+C removes isolated server data; browser-local records remain on that origin. **`npm run judge -- --evidence-only`** skips model setup and reports actual inference availability; with missing assets, it provides deterministic context with null semantic scores.

## Verification and limits

Final checks: 164 unit/integration tests, all 14 original/competitive browser tests with real local AI, plus the same five competitive checks in a genuinely missing-model fallback. A separate real-model UI probe verifies the unvalidated-tier qualification at desktop/mobile widths. Targeted axe checks have zero violations; they do not certify universal accessibility. Clean setup, financial-route blocking, shutdown isolation, original audit-chain validation and dependency audit pass. Full-history credential/buyer-field triage and source/frontend scans found no confirmed leak within their documented scope.

Existing resilience measurements remain unchanged; tmpfs timings are not physical-disk benchmarks. Genuine signed webhook delivery and Payouts transfer remain unverified outside the successful Sandbox purchasing claim. This prototype has not been evaluated by field coordinators or assistive-technology users.

## Demo and release status

The **87.76-second** silent captioned private MP4 shows actual offline/QR operation, real local semantic retrieval/grouped comparison, human boundaries and separately labeled historical Sandbox proof. SHA-256 `96d6025a229905376f38b42ed75640caf1c85123b5dee7d27fece64de5557b6d`. [Exact script/provenance](https://github.com/Ledgercorp/Waylatch/blob/feat/waylatch-competitive/docs/demo/COMPETITIVE_SCRIPT.md). Buyer approval/capture were not screen-recorded or reenacted. The final clarification affects the unvalidated tier's labels; the recorded walkthrough remains accurate. Prior previews remain preserved.

[Current screenshots](https://github.com/Ledgercorp/Waylatch/blob/feat/waylatch-competitive/docs/submission/SUBMISSION_PACKAGE.md), [submission readiness](https://github.com/Ledgercorp/Waylatch/blob/feat/waylatch-competitive/docs/SUBMISSION_READINESS.md) and [one owner approval packet](https://github.com/Ledgercorp/Waylatch/blob/feat/waylatch-competitive/docs/RELEASE_APPROVALS.md). This is an unsent private draft. No public source/video, root MIT, registration/legal acceptance or Devpost submission is authorized by preparation. Public URLs and account-specific form fields remain unset. Real spending stays **$0**.
