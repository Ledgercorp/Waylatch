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

The original twelve-case calibration benchmark remains TP5/FP0/FN1/TN6 and is not an independent accuracy estimate. All seven original uploaded MiniLM assets match the repository's pinned hashes; no model redownload, weight change or substitute embeddings. Transformers.js 4.3.1 and ONNX Runtime 1.30.0 execute real local CPU inference without transmitting descriptions.

The 240 fictional scenarios have independent model-blind nonexpert AI labels: 120 duplicate, 108 distinct, 12 ambiguous. Four supply families (80 cases) calibrate; eight disjoint families (160 cases) are held out. Existing scoring and both 0.60 thresholds were retained, the exact implementation/labels/dependencies were frozen, and held-out inference ran once with a preserved completion receipt.

On 152 nonambiguous held-out cases, deterministic TP32/FP16/FN48/TN56 gives precision 0.667, recall 0.400 and F1 0.500. Semantic-only TP62/FP70/FN18/TN2 gives F1 0.585. Combined TP57/FP70/FN23/TN2 gives precision 0.449, recall 0.713 and F1 0.551. Eight ambiguous cases remain visible but excluded. Combined finds more labeled duplicates than deterministic matching while producing substantially more false positives, and semantic-only beats combined F1. This mixed result is disclosed without retuning. Exploratory paired-family intervals, every error and all breakdowns appear in [the evaluation report](AI_EVALUATION_COMPETITIVE.md).

The dataset is synthetic English procurement data with one nonexpert AI label per case, shared templates and few family clusters. It does not establish field reliability, human-confirmed duplicate detection or fraud probability. Shared held-out inference took about 523 ms for 320 texts after about 555 ms model load, with process peak RSS about 406 MB on one Linux CPU worker; not phone/browser inference or a broad performance guarantee.

## Judge access

With Node.js 24+, npm and Python 3, run `npm run judge`. The bootstrap installs dependencies when needed, compiles the changed application when needed, verifies or downloads the same pinned model and starts an isolated loopback workspace. No merchant credentials or existing coordinator password are required. Model access is required for genuine local AI review.

Full default judge access has now passed from a clean source tree using the verified local model assets, with no merchant credentials. The optional `npm run judge -- --evidence-only` permits setup without requiring model assets; the interface must report its actual inference mode. The guide labels fictional records and the separate historical archive. Judge mode blocks financial authorization and provider operations; it never substitutes an automated financial decision for human approval.

Follow the in-app guide: preserve a fictional request offline → reload → transfer packets → reconnect and submit explicitly → compare evidence → inspect human authority boundaries → inspect the separate completed Sandbox archive → export its Proof Trail and original chain. Validate the original archive with `npm run audit:validate -- docs/evidence/paypal-sandbox-audit.json`.

## Measured engineering evidence

[Current real-AI Chromium observations](evidence/semantic-competitive-browser.json) record actual offline reload, interrupted QR recovery, repeated/malformed packet handling, explicit reconnection with zero server mutations, a difficult calibration hard-negative comparison, fictional and historical Proof Trails, sanitized export and original seven-event validation. At 390px and 1440px, historical Proof Trail checks reported no horizontal page overflow, keyboard-focused controls and no axe violations in inspected states. All nine original and five competitive browser checks now pass with genuine local inference; seven targeted competitive axe states have zero violations. Automated checks do not certify accessibility or replace assistive-technology testing.

[Controlled resilience measurements](RESILIENCE_COMPETITIVE.md) cover 60-packet interrupted transfer, persisted revision conflicts, simulated lost provider responses, three store reopen cycles, transaction rollback and audit modification detection. At 1,000 records, median full-chain validation was 2.126 ms and read-all was 3.312 ms in this worker. Temporary SQLite files were memory-backed; these are bounded harness observations, not physical-disk durability, multi-user capacity or normal model performance. No provider network calls were made. Preserve raw samples and limitations in [the report](evidence/competitive-resilience-final.json).

## New work and reuse

Waylatch continues the original RescueLedger source history. CrisisCodec is another unfinished project owned by Colby Weiss, not an outside commercial product licensed to Waylatch. Waylatch selectively adapted owner-controlled encoding and reconstruction primitives. Review of recorded affected-file history found no independently attributed contributors; metadata cannot rule out undisclosed copied material. Required dependency/model notices remain. Missing adoption of MIT in CrisisCodec does not block this private development. Root application MIT adoption is a separate owner decision. See [reuse provenance](CRISISCODEC_REUSE.md) and [license audit](LICENSE_AUDIT.md).

## Technology list

PayPal Sandbox Orders v2; React; TypeScript; Vite; Node.js 24; Express; SQLite; IndexedDB; Service Worker API; Zod; MessagePack; qrcode; jsQR; Transformers.js; ONNX Runtime CPU; pinned MiniLM q8; SHA-256; Vitest; Playwright; axe-core; Git/GitHub; Python; FFmpeg/FFprobe. No paid inference, live PayPal, lending or autonomous spending.

## Screenshots and private demo

New authentic application screenshots: [difficult comparison](evidence/competitive-comparison-desktop.png), [QR recovery](evidence/competitive-qr-recovery.png), [Proof Trail desktop](evidence/competitive-proof-1440.png) and [Proof Trail mobile](evidence/competitive-proof-390.png). The comparison screenshot explicitly reports deterministic-only mode. It does not establish semantic inference.

The original [110.04-second engineering preview](demo/waylatch-engineering-preview.mp4) remains unchanged with authentic historical paid UI/audit evidence. The [current private competitive preview](demo/waylatch-competitive-preview.mp4) is **87.68 seconds**, with newly recorded genuine MiniLM comparison, offline/QR handoff, disabled financial boundaries and separately labeled historical Sandbox proof. SHA-256 `cd673e2d243117181db3bf9e0910ffd70087b55823b90ebaaf9bc4c45b480c1c`. The previous 97.52-second fallback preview is preserved separately. [Media provenance](evidence/competitive-demo-video.json), [current script/captions](demo/COMPETITIVE_SCRIPT.md). No checkout/capture reenactment or public upload occurred.

## Remaining decisions and limitations

Genuine calibration → freeze → once-only held-out evaluation and real semantic application/judge acceptance are complete. The result improves combined recall/F1 over deterministic rules but substantially increases false positives; semantic-only F1 exceeds combined. These are synthetic grouped measurements with nonexpert AI labels, not a field-performance claim. Six prior dependency findings were resolved with supported upgrades and real-model verification. Representative field-user, assistive-technology and emergency-deployment validation remain outside current evidence.

Public GitHub/video release, root license adoption, eligibility/representation, account-controlled registration/legal terms and final Devpost submission require separate explicit owner approval after reviewing the exact final artifacts. No publication, terms acceptance or Devpost write has occurred. Exact official custom fields and account registration remain unverified; public YouTube and submission URLs are unset. Real webhook delivery/signature verification and reimbursement transfer remain unverified and are outside the completed purchasing claim. [Current blockers](BLOCKERS.md), [private package](submission/SUBMISSION_PACKAGE.md) and [existing approval packet](RELEASE_APPROVALS.md).
