# Waylatch submission package — private review copy

Prepared from the verified application; not registered, published or submitted by this task. Official rules and resources fetched successfully on 2026-10-13. Deadline: November 12, 2026, noon Pacific (20:00 UTC). Judging access must remain available through December 15, 2026, 08:00 Pacific. Recheck immediately before submission.

## Elevator pitch

Offline-ready emergency procurement and accountable payments. From field need to verified action.

## Inspiration

Emergency procurement begins with a field need, often before a reliable network connection. A request that disappears at reload cannot be reviewed; a duplicate expense paid without context cannot be reconciled. Waylatch treats preservation, handoff, review and payment accountability as one workflow.

## What judges can execute today

Create a fictional field request offline, reload, export bounded QR packets, import into a second disconnected browser, inspect provenance and missing fields, explicitly upload for review, run the actual local MiniLM model, and inspect a persisted hash-linked audit. Local test fixtures exercise server authorization, Sandbox provider contracts, dropped responses, double submission and webhook rejection. Genuine Sandbox OAuth, orders and capture have not executed: credentials are absent in this task. Claim review works independently; actual reimbursement transfer is unimplemented and Payouts entitlement unknown.

## How it works

See DEVPOST_DRAFT.md for the complete project narrative and technology list. The source architecture is in ARCHITECTURE.md; an exportable original vector diagram is architecture.svg. The browser persists structured requests in IndexedDB and scans RL1 MessagePack/CRC packets. Imported data remains untrusted. SQLite holds review/approval state and stable financial operation references. The server owns the approved amount and uses only official Sandbox REST endpoints. A local CPU embedding model supports explainable duplicate review alongside receipt, amount, incident and time signals. AI has no payment authority.

## Challenges addressed

Packet interruption and duplicate imports are handled with persistent reconstruction state and explicit revision conflicts. Historical RescueLedger data/QR/audit compatibility survives the rebrand. Uncertain provider outcomes retain a recovery state and stable idempotency keys rather than creating a second logical purchase. Webhook receipt and successful reconciliation are tracked separately so failed reconciliation can retry. The CLI requires actual operator REVIEW before review is recorded, then AUTHORIZE and CAPTURE. The public callback gateway exposes only one bounded route and leaves signature verification to the existing backend.

## Evidence

59 local tests and nine browser tests passed in this execution. Real local q8 inference produced 384-dimensional embeddings: 5 true positives, 0 false positives, 1 false negative, 6 true negatives on 12 synthetic calibration pairs. Model loading was about 4.13 seconds; peak process RSS about 210 MB in this run. This is a tiny calibration set, not held-out accuracy, fraud detection or field validation. Accessibility scans returned no violations in inspected desktop/mobile/dialog/review/claim/audit states; this is not a full accessibility certification.

## Potential impact and originality

Designed for nonprofit and relief coordinators preserving urgent procurement through disconnection. The novel integration is a continuous disconnected-to-accountable workflow, not a wallet clone or chatbot. Selective owner-authorized CrisisCodec packet primitives were adapted; all procurement/payment/risk/audit domain work and visual application are new. Exact provenance and public-rights limits are disclosed. No deployment, customer, operational emergency outcome or award probability is claimed.

## Security and privacy

Sandbox only; no live API mode, lending, BNPL or autonomous spending. Credentials and OAuth tokens stay server-side. Coordinator mutations require authenticated sessions and explicit confirmation. Requests are bounded and validated; imported data never supplies authorization. No private receipt image is transmitted; only a locally computed digest is stored. AI runs locally after assets are downloaded. No external inference service or private-record web research is used. SQLite supports a single prototype server; audit chains are tamper-evident, not immutable against an administrator rewriting the entire database.

## Accessibility and responsive experience

Semantic controls, visible connectivity/provenance/status, keyboard dialogs, strong contrast and 390px/1440px checks. Mobile field capture and QR import work in browser tests. Network status and missing information are explicit. Assistive technology and representative field-user testing remain future work.

## Deliverable map

- README.md: judge setup and genuine Sandbox runbook.
- docs/DEVPOST_DRAFT.md: full project description.
- docs/submission/project-fields.json: 21 technology tags and prepared create-project arguments; not sent.
- docs/submission/architecture.svg: original exportable architecture diagram.
- docs/evidence/interface-1440.png, interface-390.png, review-ai.png, audit.png: actual application screenshots with fictional data.
- docs/demo/waylatch-engineering-preview.mp4: finished silent captioned preview under three minutes; financial scene explicitly blocked.
- docs/demo/captions.srt and NARRATION.md: captions and exact narration/editing instructions.
- docs/VERIFICATION.md and docs/evidence/: executed test categories and sanitized integration diagnostics.
- docs/LICENSE_AUDIT.md and LICENSE-MIT-PROPOSAL.txt: license recommendation, full dependency inventory and provenance boundaries.
- docs/RELEASE_CHECKLIST.md: remaining release gates.

## Screenshot captions

Desktop: fictional Ember incident, four operational stages, visible Sandbox and connectivity status.
Mobile: responsive field ledger with offline-preservation controls.
AI review: actual local semantic inference and explicit supporting indicators; no fraud probability or autonomous decision.
Audit: actual SQLite events validated against SHA-256 event links; local automated fixtures, no PayPal transaction references fabricated.

## Account and publication gates

Devpost read calls all returned internal error -32603; account identity, registration and custom submission fields could not be established. No project was created to avoid accidental public exposure. No supported YouTube upload connection was found. The public YouTube URL is intentionally unset. Owner eligibility/representation, legal terms, CrisisCodec public rights, root MIT adoption, AMBER branding, public repository/video publication and final submission require approval only at actual release. Genuine capture and final financial footage must be completed first.

## What is next

Authenticate with securely injected Sandbox credentials, obtain real human review/authorization for the $1.00 test procurement, complete buyer approval and capture, then replace the financial scene and reconcile actual references. Optional real webhook/Payouts work must not delay the verified purchasing demonstration. Finish public release and submission only after the owner approves the concrete final candidate.
