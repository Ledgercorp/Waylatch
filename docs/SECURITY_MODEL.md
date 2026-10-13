# Security and financial model

Prototype for fictional demonstrations; not certified for emergency operations or production financial handling.

## Boundaries

All financial endpoints require an authenticated coordinator HttpOnly session. The server uses a configured passphrase of at least 12 characters, rate-limits sign-in attempts and stores only SHA-256 hashes of random session tokens in SQLite (8-hour expiry). SameSite=Strict cookies, configured-origin checks, JSON-only mutations and no CORS grants constrain cross-origin access. HTTPS sets Secure cookies. Bind loopback by default. There is no default password, unauthenticated financial route or field-device credential. This is a single-coordinator demonstration role, not multi-tenant RBAC.

A field request is untrusted. Strict Zod schemas reject unknown approval/payment fields, enforce bounds and preserve unknown values. QR imports are tracked and require fresh review. CRC32 detects accidental corruption and **does not authenticate** a request. A malicious sender can produce valid CRCs. Offline capture/import never calls PayPal.

Review note + revision are server validated. Approval requires reviewed procurement, exact cents, known incident and quantities. Claims use a separate approval route and cannot use Orders. Creating an order cannot mark a record paid. Request revision changes reset review; any payment freezes its source record. Client-submitted payment amounts and arbitrary order IDs are rejected.

SQLite holds approvals, sessions, transaction reservations and audit events durably. Unique request payment rows and in-process operation locks prevent concurrent duplicate logical purchases. Stable UUID PayPal-Request-Id keys are persisted before provider calls. Unknown response outcomes retain uncertain states; restart recovers interrupted attempts. Conservative retry windows protect against expired provider idempotency. Only one server process should own a database; multi-instance distributed locking is outside this prototype.

Order/capture references, custom_id, USD amount and a single final completed capture must match the approved record. Capture responses alone are insufficient: server inspects authoritative PayPal order details. A buyer return URL is informational and never triggers capture. Orders errors are surfaced without raw provider bodies or credentials.

Official signature verification is mandatory for webhook events. Required headers and certificate destination are bounded; no certificate URL is fetched by Waylatch. Verified notification alone does not supply a browser payment amount: authoritative order inspection reconciles known orders. Duplicate events use a persistent delivery ID. Missing webhook configuration fails closed. Local test doubles cannot establish real signed callback receipt.

Secrets stay in server configuration or ignored env files. Frontend receives only Sandbox configuration status, records and validated references. PayPal base URL is hard-coded to api-m.sandbox.paypal.com, with sandbox.paypal.com buyer approval links. No environment switch to live, live SDK script, Payouts UI execution or automatic top-up exists.

## Privacy / model

Synthetic, non-sensitive records only. Embeddings execute on local CPU using pinned, SHA-256 checked Apache-2.0 assets. Runtime remote model fetching is disabled. First install needs downloads. Deterministic-only fallback is labeled. No external AI inference or Tavily dependency exists; no private incident/receipt data is sent to research services. AI similarity is evidence for human inspection, not a fraud probability or accusation.

## Audit and limits

Events are append-only at application level and linked with canonical JSON/SHA-256. Validation detects corruption within the recorded chain. A database administrator can rewrite all events; without an independently trusted head or external anchoring the mechanism is tamper-evident, not immutable or tamper-proof. Keep independent exported audit heads if stronger assurance is needed.

Local machine access, browser-profile storage compromise, denial-of-service at public scale, passphrase sharing, session revocation across operators, formal threat review and real-world emergency reliability remain limitations. No public hosting is configured. Public deployment requires HTTPS, secure secret binding and appropriate access-control operations. Prefer the runnable-repository alternative within the $0 budget.

## Private candidate ingress and artifact review

The optional callback gateway exposes only one exact POST path, rejects missing/oversized signature headers and oversized/non-JSON bodies, strips browser credentials, uses a fixed validated loopback upstream and refuses redirects. It creates no independent payment state; official backend verification remains required. The attempted temporary tunnel failed before an endpoint existed. This is a testing boundary, not a production DDoS or ingress certification.

The preview and exported audit contain fictional records and explicit AUTOMATED LOCAL DEMO FIXTURE notes; no provider credentials, order/capture IDs or independent human decisions are invented. PayPal is explicitly disabled in recording and browser tests. The Git-history pattern scan examined226 unique baseline blobs and found no configured runtime paths or recognized token/private-key patterns. Its limits are explicit: missing PayPal secret values prevent comparison against them, and a pattern scan is not comprehensive credential clearance. Release checking separately scans the final index and frontend bundle.

## Secret alias controls

PAYPAL_SECRET_KEY is accepted only through the server configuration resolver as a fallback for absent/empty PAYPAL_CLIENT_SECRET. Canonical precedence is deterministic; failed canonical authentication does not trigger a different credential retry. The release checker loads private dotenv configuration and scans both configured values even when one is not selected, plus both names in frontend artifacts. Regression tests use deliberately fictional aliases in disposable non-Git directories and verify rejection without the fixture value in output. Automated browser/demo processes explicitly clear both names. No real credential, trace, value hash or token is introduced to logs, source or artifacts. Alias support does not bypass human financial review/authorization or change Sandbox-only enforcement.
