# Title

Waylatch

### ⏳ Not submitted yet

Nothing has been sent to Devpost.

Private draft prepared 2026-10-13. This file organizes the existing project; it does not create a Devpost project or accept rules. The local `.devpost-hackathon-state.json` is absent; workflow initialization is intentionally deferred under the owner's continuation instruction.

## One-line Summary

Offline-ready emergency procurement and accountable payments. From field need to verified action.

## Problem

Field responders and nonprofit coordinators need to preserve supply requests while networks are unreliable, then review possible duplicate expenses and account for purchases. Lost drafts and disconnected handoffs make review and reconciliation harder.

## Solution

Waylatch preserves requests in IndexedDB through offline reloads and transfers bounded RL1 QR packets between disconnected browsers. Imported information retains untrusted provenance and missing fields. A coordinator explicitly uploads, reviews and authorizes an exact revision and amount. PayPal Sandbox handles buyer approval and capture; authoritative inspection reconciles the completed purchase. A SHA-256-linked audit ties the decisions to transaction references. Separate incurred-expense claim review does not imply a reimbursement transfer.

## Why This Matters

A single workflow connects field continuity with human accountability. Unknown or similar information cannot silently acquire payment authority. The potential benefit is fewer lost requests and clearer procurement review; no customer deployment, operational emergency result or field suitability is claimed.

## How We Used AI

The coordinator's local Node server runs pinned q8 Xenova/all-MiniLM-L6-v2 through Transformers.js and CPU ONNX. Actual 384-dimensional embeddings support explainable possible-duplicate review alongside receipt, amount, incident and time indicators. AI cannot approve, reject or execute payments. Initial model download needs connectivity; field phones do not run offline embeddings. TP5/FP0/FN1/TN6 on 12 synthetic calibration pairs is a tuning-set result, not held-out accuracy, fraud detection or emergency validation. See [AI model evidence](docs/AI_MODEL.md).

## How We Used Codex

Codex assisted the existing implementation, debugging and verification of offline/QR continuity, guarded Sandbox Orders, local semantic review and audit validation, as well as preserving historical data/protocol identities during the RescueLedger-to-Waylatch rebrand. It prepared browser evidence, license/source provenance review and the captioned demo. Existing logs substantiate the engineering work. Actual user REVIEW/AUTHORIZE, genuine Sandbox buyer checkout and separate CAPTURE supplied financial consent. This finalization updates documentation/media without rebuilding the application or rerunning completed work.

## Key Features

- Offline persistence and explicit transfer/upload, with bounded packet reconstruction and revision conflicts.
- Real local semantic review with supporting indicators and an explicit deterministic fallback.
- Human approval of an exact request revision/amount and Sandbox-only authoritative purchase reconciliation.
- Independent exported audit-chain validation and stable payment operation references.
- Separate incurred-expense review, responsive field/coordinator views and tested keyboard dialogs.

The genuine reference purchase is **RL-REAL-20261013-201748 revision 1**, exact **USD 1.00 simulated**, order **2W330508JA572391V**, capture **8WY07860808872629**, PayPal **COMPLETED**, Waylatch **PAID**. Seven audit events validate. [New independent provider GETs](docs/evidence/paypal-independent-verification.json) returned HTTP200/COMPLETED for the order and capture and matched exact amount/reference/single final capture. **Real spending: USD 0.00.** [Provider evidence](docs/evidence/paypal-real-sandbox.json); [human decision and cleanup provenance](docs/PAYPAL_AUTHENTICATED_CONTINUATION.md).

## Architecture

React/TypeScript/Vite and a service worker provide the browser UI; IndexedDB/idb persists field records. MessagePack/CRC32, qrcode and jsQR support bounded untrusted handoff. Zod validates input. Node.js 24/Express and built-in SQLite own coordinator sessions, approved amounts, payment reservations and event history. The fixed official PayPal Sandbox REST client performs OAuth and Orders v2 creation/details/capture; real webhook delivery is unverified. Transformers.js/ONNX runs pinned local CPU embeddings. [Architecture](docs/ARCHITECTURE.md); [original SVG](docs/submission/architecture.svg).

Python supplies the pinned model downloader and video editing/rendering tooling; FFmpeg/FFprobe produce the silent captioned MP4. These media tools and their binaries are not bundled in the source release.

Built-with tags: paypal, react, typescript, vite, node.js, express, sqlite, indexeddb, service-workers, zod, messagepack, qrcode, jsqr, transformers.js, onnx, minilm, sha-256, vitest, playwright, axe-core, github.

## Testing Instructions

Follow [README.md](README.md) with Node.js 24+, npm, Python 3 and Chromium. Install locked dependencies in CPU mode, create local settings from `.env.example`, set a local coordinator passphrase, download the pinned free model assets, build and start the loopback production app. No application credentials are distributed. Use Sandbox-only credentials when exercising purchasing.

1. Create a fictional request, simulate disconnection, reload and verify the IndexedDB request survives.
2. Export RL1 QR packets; import into a second disconnected browser and inspect reconstruction/provenance.
3. Reconnect and explicitly upload. Run local semantic review and inspect reasons rather than treating similarity as fraud certainty.
4. Inspect purchase approval gates. A new Sandbox transaction needs actual human REVIEW/AUTHORIZE, genuine buyer approval and separate CAPTURE. Do not repeat the already completed reference purchase.
5. Independently validate `docs/evidence/paypal-sandbox-audit.json` with `npm run audit:validate -- docs/evidence/paypal-sandbox-audit.json`; compare record/revision/amount/order/capture references.

The audit CLI accepts validated raw arrays or `envelope.events`, rejects invalid shapes and validates the chain without trusting claimed metadata. Judge-command review exposed the previous unchecked-envelope path. Four new targeted checks passed for the genuine envelope, raw array, tampered event and missing events; [targeted log](docs/evidence/release-audit-cli-green.log), [genuine seven-event command result](docs/evidence/release-audit-envelope-green.log). No earlier whole suite was repeated.

Existing reported checks: 69 local tests and nine browser tests at the alias-compatibility checkpoint; earlier real local inference/calibration and clean-install evidence remain in [VERIFICATION.md](docs/VERIFICATION.md). These are prior executed checks, not new finalization runs. Provider doubles, network emulation and automated UI decisions remain labeled simulations.

## Public Demo Link

**PENDING publication approval.** No hosted deployment proposed. Judges should run the repository locally; no paid hosting is needed. Mobile buyer return to cloud loopback failed in the real transaction; provider inspection proved approval independently. That return-page defect is disclosed.

## Public Repository Link

https://github.com/Ledgercorp/Waylatch — **currently private; visibility change and source license await owner approval**. Proposed release is source/lockfile/docs and sanitized evidence, excluding secrets, SQLite databases, model/native binaries, recording caches and node_modules.

## Demo Video

Private asset: [docs/demo/waylatch-engineering-preview.mp4](docs/demo/waylatch-engineering-preview.mp4), under three minutes. Actual nonfinancial app footage and labeled automated fixtures are retained. The real completed payment is shown in newly recorded actual settled PAID UI and seven-event audit, followed by an explicitly identified independent provider-evidence insert; buyer checkout/capture was not screen-recorded. [Narration](docs/demo/NARRATION.md), [script](docs/DEMO_SCRIPT.md), [final hash/duration](docs/evidence/demo-video.json).

**Public YouTube URL: PENDING approved upload.** No public video is available yet.

## Screenshot Shot List

- [Desktop](docs/evidence/interface-1440.png): fictional Ember incident and four operational stages.
- [Mobile](docs/evidence/interface-390.png): responsive field ledger and offline controls.
- [Local AI review](docs/evidence/review-ai.png): actual local semantic inference and supporting indicators.
- [Audit](docs/evidence/audit.png): original local UI fixture audit; do not label it as the genuine transaction.
- [Genuine completed payment](docs/evidence/payment-completed.png): actual PAID screen with order/capture references, exact USD1.00 simulated and disabled create/capture controls.
- [Genuine purchase audit](docs/evidence/audit-paypal-completed.png): actual seven-event audit whose browser export matches SQLite.
- Actual settled PAID UI and seven-event audit in the revised video: exact simulated amount, order/capture IDs and seven-event audit; source JSON provenance is retained.

## Submission Readiness Notes

Known-field copy and local assets are prepared. [SUBMISSION_PACKAGE.md](docs/submission/SUBMISSION_PACKAGE.md) indexes the review packet and [RELEASE_APPROVALS.md](docs/RELEASE_APPROVALS.md) consolidates the final owner decisions. Devpost whoami, registration listing, requirements, judging and dates each returned internal error -32603 during this finalization. No official custom fields or account/registration facts are inferred. No registration, agreement acceptance, repository visibility change, license adoption, public upload or Devpost project/submission write occurred.

Existing source provenance dates the original RescueLedger work to October 13, 2026. Two CrisisCodec packet/reconstruction primitives were selectively adapted from commit 8ca845cb19a5cdd29897171c61b1ec95b5c1ba7f under private owner authorization; public rights and contributor ownership still require confirmation. [Reuse ledger](docs/CRISISCODEC_REUSE.md), [license audit](docs/LICENSE_AUDIT.md), [notices](docs/THIRD_PARTY_NOTICES.md). Waylatch branding remains AMBER with incomplete registry searches, not legal clearance.

## Known Limitations

Payout transfer is unimplemented/entitlement unverified. Actual webhook subscription, callback delivery and official signature verification were not demonstrated. The mobile Sandbox return page failed at loopback. SQLite serves a single prototype instance. Audit history is tamper-evident, not immutable against an administrator rewriting the database. AI uses a small synthetic English calibration, with no held-out or representative field validation. Accessibility scans covered selected states, not universal assistive-technology certification. No deployment, production readiness or live funds are claimed.

[Fresh webhook diagnostic](docs/WEBHOOK_RELEASE_STATUS.md): real registration/event GETs returned HTTP200 with zero results. Three unsigned/synthetic callbacks were rejected HTTP400 without changing copied PAID state or its seven-event audit. This is fail-closed rejection evidence, not a genuine signed callback.

## TODO Official Form Fields

**Exact live form fields unavailable.** Obtain account identity and the event's registered relationship; retrieve official requirements, required custom question IDs/labels/options and upload rules before any Devpost mutation. Collect any missing participant/team, eligibility and representation answers without invention. Present the actual rules/terms/eligibility agreements in the consolidated approval; never mark them accepted from draft preparation.

Public repository/license and YouTube URL await approval/publication. Devpost project/submission URL and receipt await the approved action. Only if the live form explicitly asks for a Codex session ID should a candidate identifier/timestamp be shown for owner confirmation; none has been read or inferred here. Exact form-specific fields stay pending until available.
