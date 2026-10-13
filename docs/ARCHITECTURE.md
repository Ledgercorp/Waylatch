# RescueLedger engineering specification

Purpose: preserve disconnected emergency supply requests and make immediate human-authorized Sandbox purchases accountable. Synthetic demonstration only; no emergency deployment claim. No credit, lending, advances, autonomous financial authorization, live PayPal, or paid infrastructure.

React/TypeScript/Vite supports Request → Review → Pay → Audit. Field records and receiver fragments persist in IndexedDB. A service worker caches the shell. Explicit upload on reconnection never purchases automatically. MessagePack/CRC32 QR packets are untrusted transport, not authentication. All reconstructed records require new server-side human review.

Node 24 / Express uses built-in SQLite for durable requests, approvals, payment attempts, sessions and hash-linked audit events. Same-origin HttpOnly sessions with coordinator passphrase protect reads and mutations; financial operations require explicit review and purchase approval for the frozen record revision and exact USD cents. Return URLs are configured server-side. Sandbox-only PayPal REST OAuth → Orders v2 → browser approval redirect → authoritative inspect/capture. Stable PayPal-Request-Id values persist across retries. Uncertain operations reconcile before retry; no order-created state becomes paid. Official verification API gates webhook state changes.

AI: pinned Apache-2.0 MiniLM ONNX weights, Transformers.js CPU inference local to server after predownload; evidence reasons combine semantic cosine similarity with deterministic signals. No probabilities or accusations. Offline field capture does not depend on the model. Claims have a separate review workflow; payouts stay disabled until entitlement evidence and implementation exist.

Boundaries: src/requests/schema.ts shared strict request types; src/offline packet/reconstruction/storage; src/risk semantic evidence; server/paypal.ts provider; server/store.ts SQLite and atomic audit; server/payments.ts state machine; server/app.ts auth and routes; src/components UI stages. Optional research cannot affect payments.

Verification: schema/packet corruption and revision cases; API authorization/amount tampering/concurrency/restart; audit corruption; real model benchmark; browser offline reload, QR across contexts, mobile/desktop accessibility. Real PayPal capture and public webhooks need credentials/HTTPS and cannot be claimed from stubs.
