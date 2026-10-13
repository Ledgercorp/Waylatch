# Waylatch submission package — private review copy

Prepared from the existing verified application and genuine completed Sandbox purchase; no registration, public release or Devpost write performed by this task. Official rules/resources were previously fetched on 2026-10-13 and their recorded requirements are summarized in [HACKATHON_REQUIREMENTS.md](../HACKATHON_REQUIREMENTS.md). Previously recorded deadline: November 12, 2026, noon Pacific (20:00 UTC); judging-access end: December 15, 2026, 08:00 Pacific. These dates/custom form constraints were not re-established through Devpost in this drafting pass: live read calls returned internal error -32603. Recheck before the approved release; do not treat cached requirements as a fresh consent gate.

## Elevator pitch

Offline-ready emergency procurement and accountable payments. From field need to verified action.

## Inspiration

Emergency procurement begins with a field need, often before a reliable network connection. A request that disappears at reload cannot be reviewed; a duplicate expense paid without context cannot be reconciled. Waylatch treats preservation, handoff, review and payment accountability as one workflow.

## What judges can execute today

Create a fictional field request offline, reload, export bounded QR packets, import into a second disconnected browser, inspect provenance and missing fields, explicitly upload for review, run the actual local MiniLM model, and inspect a persisted hash-linked audit. Local test fixtures exercise server authorization, Sandbox provider contracts, dropped responses, double submission and webhook rejection. Genuine Sandbox OAuth, order creation, actual buyer approval and separately authorized capture have executed. PayPal order **2W330508JA572391V** and capture **8WY07860808872629** are **COMPLETED**, application state **PAID**, exact **USD 1.00 simulated / USD 0.00 real spending**, for request **RL-REAL-20261013-201748 revision 1**. New independent read-only GETs returned HTTP200 for both resources, confirming the exact amount/reference and single final matching capture. Seven genuine audit events validate independently. The failed mobile loopback return page is disclosed; provider inspection supplied authoritative approval and payment evidence. Claim review works independently; actual reimbursement transfer is unimplemented and Payouts entitlement unknown.

## How it works

See [DEVPOST_DRAFT.md](../DEVPOST_DRAFT.md) for the complete project narrative and technology list. The source architecture is in ARCHITECTURE.md; an exportable original vector diagram is architecture.svg. The browser persists structured requests in IndexedDB and scans RL1 MessagePack/CRC packets. Imported data remains untrusted. SQLite holds review/approval state and stable financial operation references. The server owns the approved amount and uses only official Sandbox REST endpoints. A local CPU embedding model supports explainable duplicate review alongside receipt, amount, incident and time signals. AI has no payment authority.

## Challenges addressed

Packet interruption and duplicate imports are handled with persistent reconstruction state and explicit revision conflicts. Historical RescueLedger data/QR/audit compatibility survives the rebrand. Uncertain provider outcomes retain a recovery state and stable idempotency keys rather than creating a second logical purchase. Webhook receipt and successful reconciliation are tracked separately so failed reconciliation can retry. The CLI requires actual operator REVIEW before review is recorded, then AUTHORIZE and CAPTURE. The public callback gateway exposes only one bounded route and leaves signature verification to the existing backend.

## Evidence

Prior alias-compatibility verification passed 69 local tests and nine browser tests; prior release-candidate verification passed 59 local tests and nine browser tests. These completed checks were not repeated in this finalization. Real local q8 inference produced 384-dimensional embeddings: 5 true positives, 0 false positives, 1 false negative, 6 true negatives on 12 synthetic calibration pairs. In the prior benchmark, model loading was about 4.13 seconds and peak process RSS was about 210 MB. This is a tiny calibration set, not held-out accuracy, fraud detection or field validation. Accessibility scans returned no violations in inspected desktop/mobile/dialog/review/claim/audit states; this is not a full accessibility certification.

The judge audit-command review found that the CLI previously accepted an export envelope without checking its events. The corrected CLI validates either a raw event array or `envelope.events`, rejects invalid shapes and ignores claimed validity metadata. Four new targeted checks passed: genuine envelope, raw array, tampered event and missing events. Earlier whole-suite checks were not rerun. [CLI checks](../evidence/release-audit-cli-green.log), [genuine envelope result](../evidence/release-audit-envelope-green.log); red evidence is retained.

## Potential impact and originality

Designed for nonprofit and relief coordinators preserving urgent procurement through disconnection. The novel integration is a continuous disconnected-to-accountable workflow, not a wallet clone or chatbot. Selective owner-authorized CrisisCodec packet primitives were adapted; all procurement/payment/risk/audit domain work and visual application are new. Exact provenance and public-rights limits are disclosed. No deployment, customer, operational emergency outcome or award probability is claimed.

## Security and privacy

Sandbox only; no live API mode, lending, BNPL or autonomous spending. Credentials and OAuth tokens stay server-side. Coordinator mutations require authenticated sessions and explicit confirmation. Requests are bounded and validated; imported data never supplies authorization. No private receipt image is transmitted; only a locally computed digest is stored. AI runs locally after assets are downloaded. No external inference service or private-record web research is used. SQLite supports a single prototype server; audit chains are tamper-evident, not immutable against an administrator rewriting the entire database.

## Accessibility and responsive experience

Semantic controls, visible connectivity/provenance/status, keyboard dialogs, strong contrast and 390px/1440px checks. Mobile field capture and QR import work in browser tests. Network status and missing information are explicit. Assistive technology and representative field-user testing remain future work.

## Deliverable map

- README.md: judge setup and genuine Sandbox runbook.
- docs/DEVPOST_DRAFT.md: updated full project description; devpost-submission.md: complete drafting outline and judge instructions.
- docs/submission/project-fields.json: 21 technology tags and prepared create-project arguments; not sent. Use the refreshed narrative/metadata, not historical pending-capture copy.
- docs/submission/architecture.svg: original exportable architecture diagram.
- docs/evidence/interface-1440.png, interface-390.png, review-ai.png, audit.png: actual original application screenshots with fictional data and labeled local fixtures.
- [payment-completed.png](../evidence/payment-completed.png) and [audit-paypal-completed.png](../evidence/audit-paypal-completed.png): newly recorded actual settled USD1.00 Sandbox PAID screen and genuine seven-event audit.
- docs/demo/waylatch-engineering-preview.mp4: revised silent captioned MP4 under three minutes; original nonfinancial scenes plus actual newly recorded settled PAID UI/seven-event audit and clearly labeled independent provider evidence. No invented buyer checkout/capture footage.
- docs/demo/captions.srt and NARRATION.md: captions and exact narration/editing instructions.
- docs/VERIFICATION.md and docs/evidence/: executed test categories and sanitized integration diagnostics.
- docs/LICENSE_AUDIT.md and LICENSE-MIT-PROPOSAL.txt: license recommendation, full dependency inventory and provenance boundaries.
- docs/RELEASE_APPROVALS.md: ONE consolidated owner approval packet for the exact release proposal; docs/RELEASE_CHECKLIST.md: engineering release gates.
- docs/evidence/paypal-real-sandbox.json, paypal-independent-verification.json, paypal-sandbox-audit.json and paypal-sandbox-audit-validation.json: genuine provider result, new independent read-only confirmation and seven-event chain validation.

## Screenshot captions

Desktop: fictional Ember incident, four operational stages, visible Sandbox and connectivity status.
Mobile: responsive field ledger with offline-preservation controls.
AI review: actual local semantic inference and explicit supporting indicators; no fraud probability or autonomous decision.
Audit: actual SQLite events validated against SHA-256 event links; local automated fixtures, no PayPal transaction references fabricated.

Completed payment: [actual PAID screen](../evidence/payment-completed.png) showing the genuine order/capture references and USD1.00 simulated amount; create/capture controls disabled.
Genuine audit: [actual seven-event audit](../evidence/audit-paypal-completed.png) from the settled purchase; browser export exactly matches SQLite.

New [settled UI recording evidence](../evidence/settled-demo-recording.json) confirms both financial operation buttons disabled, authoritative payment inspection COMPLETED, browser audit export exactly matching persisted seven events and unchanged financial state. The original screenshot audit remains a labeled historical local fixture; the video audit has been replaced by the genuine seven-event scene.

## Account and publication gates

Devpost read calls all returned internal error -32603; account identity, registration and custom submission fields could not be established. No project was created to avoid accidental public exposure. No supported YouTube upload connection was found. The public YouTube URL is intentionally unset. Owner eligibility/representation, actual registration/legal terms, CrisisCodec public rights, root MIT adoption, AMBER branding, public repository/video publication and final Devpost action are consolidated in [RELEASE_APPROVALS.md](../RELEASE_APPROVALS.md). Genuine capture is complete. The video shows actual settled PAID UI and the real seven-event audit, with independent provider evidence identified as such; it does not claim buyer checkout/capture was screen-recorded. Registration, exact custom fields and upload account access remain external blockers. Optional webhook/Payouts work is outside the demonstrated purchasing scope.

## What is next

Review the final MP4, source/license provenance, refreshed project text and exact evidence references through the consolidated approval packet. Resolve account-controlled official form/registration fields and public-video upload access, then obtain one explicit owner release decision before any license adoption, visibility change, upload, terms acceptance or Devpost action. Preserve the completed reference purchase; do not capture again. All real spending remains $0.

[Fresh webhook diagnostic](../WEBHOOK_RELEASE_STATUS.md): actual registration/event GETs returned HTTP200 with zero results; three unsigned/synthetic callbacks were rejected HTTP400 and copied PAID state/seven-event audit stayed unchanged. Genuine delivery/signature verification remains unverified and is not a purchasing blocker.
