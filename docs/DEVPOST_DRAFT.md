# Devpost project draft — private competitive work

## Project name and pitch

Waylatch — Offline-ready emergency procurement and accountable payments.

From field need to verified action. Preserve a request without connectivity, hand it off by QR, compare review evidence and follow the recorded decisions through a Proof Trail.

## Problem and audience

Field responders, volunteer coordinators and nonprofit teams may need supplies before reliable connectivity returns. Lost requests, repeated descriptions and uncertain expense records make later authorization and reconciliation harder. Waylatch connects preservation, handoff, advisory review and human payment authority in one workflow.

## What it does

A fictional field request survives offline reload in IndexedDB. Bounded MessagePack QR packets reconstruct it on another browser, with explicit partial-transfer, duplicate-packet and revision-conflict states. Reconnection does not submit a request or execute a payment automatically.

The coordinator compares descriptions side by side, sees matching and differing terms, checks receipts, transaction references, amounts, incident and timing context, and records a related, unrelated or investigate disposition. The interface distinguishes deterministic findings from semantic evidence and reports when inference is unavailable. Potential duplication remains a question for a person; similarity is never a probability of fraud.

The new Proof Trail connects available request metadata, browser provenance, server audit events and saved provider evidence. It exposes missing events rather than manufacturing a complete story. A sanitized JSON report supports sharing; the separate original organization event chain supports independent SHA-256 validation. Local metadata does not prove an offline action occurred. Hash links do not prevent an administrator rewriting a complete database.

## Genuine payment evidence

The previously completed purchase is request **RL-REAL-20261013-201748**, revision **1**, order **2W330508JA572391V**, capture **8WY07860808872629**: **USD 1.00 simulated Sandbox funds; USD 0.00 real spending; COMPLETED / PAID**. Actual human REVIEW and AUTHORIZE, genuine buyer approval and a separate human CAPTURE decision preceded settlement. Saved independent read-only provider GETs confirmed the order, capture, amount, reference and single final capture. Seven original audit events validate.

The judge archive displays that historical evidence separately from fictional walkthrough requests. It does not initiate another purchase, inspect PayPal live during playback or imply that the historical transaction occurs during an automated demo. The buyer's mobile loopback return page failed; authoritative provider inspection established approval and capture. See [saved provider evidence](evidence/paypal-real-sandbox.json), [independent verification](evidence/paypal-independent-verification.json) and [original event chain](evidence/paypal-sandbox-audit.json).

## How we built it

React, TypeScript and Vite provide Request → Review → Pay → Proof → Audit within the existing visual identity. IndexedDB and a production service worker preserve field continuity. Strict Zod validation and bounded MessagePack/CRC32 packets treat imports as untrusted. Node 24, Express and built-in SQLite preserve review, authorization, reservations and audit events. Official PayPal Sandbox Orders v2 provides order creation, buyer approval, capture and reconciliation. Uncertain outcomes use persisted idempotency keys and explicit recovery.

The existing pinned Apache-2.0 Xenova/all-MiniLM-L6-v2 q8 ONNX model runs through Transformers.js on local CPU after separately verified asset provisioning. It produces 384-dimensional embeddings without sending descriptions to an external inference service. Financial authority stays behind authenticated server gates; AI and relationship dispositions cannot approve or capture payments.

## Genuine AI evaluation and limitations

The original 12-case threshold-selected benchmark remains TP5/FP0/FN1/TN6; it is not an independent accuracy estimate. The exact uploaded pinned MiniLM assets verify, and Transformers.js 4.3.1/ONNX 1.30.0 perform genuine local CPU inference. No model substitution, download or external inference service was used for this phase.

Original frozen held-out result (152 nonambiguous synthetic pairs): deterministic TP32/FP16/FN48/TN56, precision .667, recall .400, F1 .500; semantic TP62/FP70/FN18/TN2, precision .470, recall .775, F1 .585; combined TP57/FP70/FN23/TN2, precision .449, recall .713, F1 .551. Combined incorrectly flagged 70 of 72 distinct pairs. These measured failures remain unchanged.

We then separated informational semantic retrieval from structured needs-verification and strong-evidence tiers, grouped repeated candidate summaries and emphasized contradicting/missing facts. Similar language or an invoice document alone cannot establish transaction identity. Already stored optional location, expense time and amount certainty add context; supplier identity, line allocation and authoritative fulfillment facts are often absent.

A genuinely new protocol defined targets before predictions: 240 new fictional pairs, 80 calibration/160 held-out across disjoint supply families. Two fresh blinded nonexpert AI judgments per case preserve ambiguity and disagreement; they are not expert-human or field truth. Final held-out had 54 duplicate, 80 distinct and 26 ambiguous pairs. Code, settings, original model, data and labels were frozen before the once-only run.

On the same 134 binary pairs, preserved v1 combined had TP48/FP77/FN6/TN3 (precision .384, recall .889, F1 .536). Revised attention had TP10/FP30/FN44/TN50 (precision .250, recall .185, F1 .213). False attention per 100 distinct fell 96.25→37.50, but precision/recall worsened and the predefined targets failed. Zero strong predictions means undefined strong precision, not perfect accuracy. At a fixed 26-pair review budget, duplicates retrieved fell 6→4. Records-only tier agreement was 59/146 (.404), with 14 ambiguous tiers excluded. No improved detection, ranking, human workload effectiveness or field reliability is claimed. The interface is a quieter advisory comparison prototype; a person must inspect the actual records.

[Full v2 scientific report](AI_REVIEW_QUALITY_V2.md) includes original and new results, every failure, family/category breakdowns, exploratory grouped-bootstrap intervals and frozen receipts. Held-out model load was about 534 ms, shared inference about 363 ms across 273 unique texts, peak process RSS about 391 MiB on one Linux CPU worker. These are bounded host observations, not phone/browser inference or operational performance guarantees. Neither exposed test may be reused as independent validation.

## Judge access

With Node.js 24+, npm and Python 3, run `npm run judge`. The bootstrap installs dependencies when needed, compiles the changed application when needed, verifies or downloads the same pinned model and starts an isolated loopback workspace. No merchant credentials or existing coordinator password are required. Model access is required for genuine local AI review.

Full default judge access has now passed from a clean source tree using the verified local model assets, with no merchant credentials. The optional `npm run judge -- --evidence-only` permits setup without requiring model assets; the interface must report its actual inference mode. The guide labels fictional records and the separate historical archive. Judge mode blocks financial authorization and provider operations; it never substitutes an automated financial decision for human approval.

Follow the in-app guide: preserve a fictional request offline → reload → transfer packets → reconnect and submit explicitly → compare evidence → inspect human authority boundaries → inspect the separate completed Sandbox archive → export its Proof Trail and original chain. Validate the original archive with `npm run audit:validate -- docs/evidence/paypal-sandbox-audit.json`.

## Measured engineering evidence

[Current real-AI Chromium observations](evidence/quality-browser.json) record actual offline reload, interrupted QR recovery, repeated/malformed packet handling, explicit reconnection with zero server mutations, a development-visible consolidated-receipt hard-negative comparison, fictional and historical Proof Trails, sanitized export and original seven-event validation. At 390px and 1440px, historical Proof Trail checks reported no horizontal page overflow, keyboard-focused controls and no axe violations in inspected states. All nine original and five competitive browser checks now pass with genuine local inference; seven targeted competitive axe states have zero violations. Automated checks do not certify accessibility or replace assistive-technology testing.

[Controlled resilience measurements](RESILIENCE_COMPETITIVE.md) cover 60-packet interrupted transfer, persisted revision conflicts, simulated lost provider responses, three store reopen cycles, transaction rollback and audit modification detection. At 1,000 records, median full-chain validation was 2.126 ms and read-all was 3.312 ms in this worker. Temporary SQLite files were memory-backed; these are bounded harness observations, not physical-disk durability, multi-user capacity or normal model performance. No provider network calls were made. Preserve raw samples and limitations in [the report](evidence/competitive-resilience-final.json).

## New work and reuse

Waylatch continues the original RescueLedger source history. CrisisCodec is another unfinished project owned by Colby Weiss, not an outside commercial product licensed to Waylatch. Waylatch selectively adapted owner-controlled encoding and reconstruction primitives. Review of recorded affected-file history found no independently attributed contributors; metadata cannot rule out undisclosed copied material. Required dependency/model notices remain. Missing adoption of MIT in CrisisCodec does not block this private development. Root application MIT adoption is a separate owner decision. See [reuse provenance](CRISISCODEC_REUSE.md) and [license audit](LICENSE_AUDIT.md).

## Technology list

PayPal Sandbox Orders v2; React; TypeScript; Vite; Node.js 24; Express; SQLite; IndexedDB; Service Worker API; Zod; MessagePack; qrcode; jsQR; Transformers.js; ONNX Runtime CPU; pinned MiniLM q8; SHA-256; Vitest; Playwright; axe-core; Git/GitHub; Python; FFmpeg/FFprobe. No paid inference, live PayPal, lending or autonomous spending.

## Screenshots and private demo

New authentic application screenshots: [difficult comparison](evidence/quality-comparison-desktop.png), [QR recovery](evidence/quality-qr-recovery.png), [Proof Trail desktop](evidence/quality-proof-1440.png) and [Proof Trail mobile](evidence/quality-proof-390.png). The current comparison screenshot shows genuine semantic inference, an informational tier and contradictory transaction context.

The original [110.04-second engineering preview](demo/waylatch-engineering-preview.mp4) remains unchanged with authentic historical paid UI/audit evidence. The [current private competitive preview](demo/waylatch-competitive-preview.mp4) is **87.76 seconds**, with newly recorded genuine MiniLM, tiered/grouped comparison, offline/QR handoff, disabled financial boundaries and separately labeled historical Sandbox proof. SHA-256 `96d6025a229905376f38b42ed75640caf1c85123b5dee7d27fece64de5557b6d`. The previous 87.68-second candidate and 97.52-second fallback are preserved separately. [Media provenance](evidence/competitive-demo-video.json), [current script/captions](demo/COMPETITIVE_SCRIPT.md). No checkout/capture reenactment or public upload occurred.

## Remaining decisions and limitations

The new evaluation failed its predefined targets. Fewer visible alerts did not improve identity precision, recall or fixed-budget ranking, and tier labels have poor agreement. Human usefulness remains unmeasured. Synthetic scenarios, nonexpert AI labels, shared author conventions and few family clusters do not establish real-world effectiveness or fraud probability.

Engineering acceptance passes: 163 unit/integration tests, all 14 browser tests including real AI, targeted mobile/desktop axe checks, clean default semantic judge setup and original audit validation. Dependency audit has zero findings; all six prior findings remain resolved without changes this phase. Scans and automated accessibility checks have bounded scope. Actual signed webhook delivery and reimbursement transfer remain unverified outside the successful purchasing demonstration.

Public GitHub/video release, root license adoption, eligibility/representation, registration/legal terms and final Devpost submission require separate explicit owner approval of the final artifacts. Official account/custom fields and upload access are unverified; no public URL is invented. [Current private package](submission/SUBMISSION_PACKAGE.md), [owner approval packet](RELEASE_APPROVALS.md). Nothing was published/submitted, and real spending is $0.
