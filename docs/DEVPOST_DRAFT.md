# Devpost project draft — release review required

## Project name / tagline

Waylatch — Offline-ready emergency procurement and accountable payments.

Tagline: From field need to verified action.

## Problem and audience

Field responders, volunteer coordinators and nonprofit teams may need to request supplies before reliable connectivity returns. Lost requests and duplicate expense records make later authorization and reconciliation harder. Waylatch preserves the request, carries it between devices and maintains a clear boundary between AI evidence and human financial authority.

## What it does

A field request survives offline reload in IndexedDB. Compact MessagePack QR packets reconstruct it on another device, preserving unknown fields and import provenance. A local MiniLM embedding model compares descriptions alongside exact receipt, amount, incident and time indicators. A human records a disposition and explicitly approves a frozen procurement revision. PayPal Sandbox Orders v2 supplies buyer approval and capture, while authoritative order inspection reconciles the resulting payment. SHA-256-linked events connect record, review, approval and transaction references. Separate incurred-expense claims receive human review without becoming purchase orders.

**Accuracy note for this draft:** real local inference and offline transfers are executed. The Sandbox client is implemented and contract-tested, but actual account checkout/capture is pending secure credentials. Payouts is blocked/unimplemented, not a completed reimbursement transfer. Update the final description only after real evidence exists. Do not submit this draft as a functioning financial demonstration yet.

## How we built it

React, TypeScript and Vite supply a responsive four-stage command interface. IndexedDB and a production service worker preserve field continuity. Strict Zod validation and bounded MessagePack/CRC32 envelopes treat imports as untrusted. Node 24 / Express and built-in SQLite hold durable review, authorization, reservations and audit events. The official Sandbox REST APIs handle OAuth, Orders v2 creation/details/capture and webhook signature verification. Pinned Apache-2.0 MiniLM ONNX weights run through Transformers.js on local CPU without external inference calls. AI recommendations cannot execute or reject a payment.

## Innovation / impact

The integration makes connectivity loss part of procurement operations: field capture, a disconnected handoff, explainable duplicate review, explicit financial authorization and reconciliation are one continuous product flow. CRCs do not masquerade as authentication, semantic similarity does not masquerade as fraud certainty, and unknown data cannot silently become payment authority.

This is a synthetic prototype for a specific operational problem, not evidence of emergency readiness. Impact requires testing with representative organizations and field workflows before real-world deployment.

## New work and reuse

The original RescueLedger implementation was created during the 2026 submission period and continues as Waylatch without rebuilding or rewriting its history. With owner authorization, it selectively adapts CrisisCodec's codec/reconstruction primitives at commit 8ca845c; request/claim domain, guarded PayPal integration, local semantic review, audit chain and visual product are new work. CrisisCodec UI/domain behavior was not cloned. Exact source adaptation and rights limitations are disclosed in CRISISCODEC_REUSE.md.

## Technology list

PayPal Developer Platform (Sandbox OAuth, Orders v2, browser buyer approval, capture/details, webhook signature-verification API); React; TypeScript; Vite; Node.js 24; Express; SQLite (node:sqlite); IndexedDB/idb; Service Worker API; Zod; MessagePack (@msgpack/msgpack); qrcode; jsQR; Transformers.js; ONNX Runtime CPU; Xenova/all-MiniLM-L6-v2 (Apache-2.0, q8); SHA-256/Web Crypto; Vitest; Playwright; axe-core; Git/GitHub; Python (model asset downloader only).

No Nebius, paid inference, Tavily critical dependency, credit/lending service or live PayPal mode. Payouts probe support is not a completed reimbursement integration.

## What remains before submission

Real Sandbox capture evidence, optional real verified webhook callback, approved root license/public repository, public YouTube demonstration under three minutes, owner registration/representation/legal consent and final Devpost approval.
