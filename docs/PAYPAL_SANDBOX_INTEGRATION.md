# Current PayPal secret-name compatibility

`PAYPAL_SECRET_KEY` is a supported server-side fallback. A nonempty `PAYPAL_CLIENT_SECRET` wins; missing/empty canonical uses the alias. The shared resolver reads process configuration without mutating it, exposing values to the browser or copying values into persistent files. Server/OAuth/integration/probe use it consistently. The fixed Sandbox endpoint, stable PayPal request IDs and human REVIEW/AUTHORIZE/CAPTURE/buyer-approval gates remain unchanged. No alias retry follows an HTTP rejection of the chosen canonical credential.

Requested temporary mapping ran in a single diagnostic process without shell tracing or persisted values. This executor reports PAYPAL_CLIENT_ID=false, PAYPAL_CLIENT_SECRET=false and PAYPAL_SECRET_KEY=false. The mapped diagnostic and alias-aware diagnostic both exited2 before a request. This is **missing configuration in this executor**, not evidence of invalid credentials, a proxy-placeholder rejection or a transport failure. No genuine OAuth/order/buyer approval/capture/callback/Payouts operation occurred. Runtime metadata is safe and has no bindings/source association. No environment rename/reconfiguration is requested to resolve the now-fixed naming mismatch.

Six local configuration regressions authenticate through synthetic transports to verify canonical-only support, precedence, absent/empty fallback, fail-closed behavior and no environment mutation. Two process-boundary alias tests retain declined review/authorization with zero provider financial calls. Two release regressions verify alias leakage is detected from process and dotenv even if canonical is preferred. Browser/demo processes clear both names. All synthetic authentication results remain labeled local doubles, not PayPal evidence.

Sanitized diagnostic failure interpretation:

| Observation                                                    | Interpretation                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| requestExecuted=false / SANDBOX_CREDENTIALS_MISSING            | Required effective configuration absent; no authentication/network result                                                      |
| Actual HTTP401 / SANDBOX_OAUTH_FAILED                          | Provider rejected the presented Basic authentication; confirm direct vs proxy binding before asserting raw credentials invalid |
| Known network-secret binding / placeholder with derived Base64 | Placeholder compatibility unverified; report separately, never print or extract value                                          |
| No provider HTTP response / CONNECTIVITY_OR_RESPONSE_ERROR     | Transport or response parsing/runtime evidence needs separation; don't describe it as a provider credential rejection          |

No current value exists here to inspect or classify as a placeholder, and no current transport request failed. Existing raw-error logging remains suppressed. See paypal-alias-runtime.json and paypal-oauth.json. Real financial footage remains pending genuine capture; no simulated result is substituted.

---

## Previous investigation and runbook — historical configuration wording superseded

# Waylatch PayPal Sandbox integration evidence and runbook

## Current actual-provider status

Checked 2026-10-13. **Blocked at credential configuration, before OAuth.** The task runtime lacks `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. `PAYPAL_WEBHOOK_ID` is also absent. Cloud environment-status observations report no secret bindings; the user's separate setup attempt does not establish task-time availability.

`npm run paypal:auth` writes sanitized `docs/evidence/paypal-oauth.json`: date/time, implementation commit/dirty state, fixed host/path, missing variable names, requestExecuted, authentication outcome, HTTP status and sanitized provider result. The observed result has category blocked-configuration, code SANDBOX_CREDENTIALS_MISSING, requestExecuted=false, authenticated=false, HTTP status=null. **No access token, order, buyer approval, capture, payout or real callback has been obtained.** Nothing is passed to the browser.

A historical environment editor `Invalid keys` message is not an OAuth HTTP rejection. If credentials later reach the client and PayPal returns HTTP401, the provider reports SANDBOX_OAUTH_FAILED with status401. DNS/TLS/transport/response errors are separately labeled. Do not regenerate keys on the basis of an unrelated setup-validation error.

## Configuration and host boundaries

The Merchant Sandbox app type is appropriate for this one-time direct purchase; no marketplace/Platform conversion is required. Current backend configuration reads `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, optional `PAYPAL_WEBHOOK_ID`, `COORDINATOR_PASSWORD`, `APP_ORIGIN` and `DATABASE_PATH`. Secrets must be environment-scoped bindings available to this task execution, or a local ignored configuration used only in an authorized runnable-repository setup. Never paste secrets into chat, archive them, expose them to external AI, or put values in `.env.example`.

Required backend HTTPS host: **api-m.sandbox.paypal.com**. It is fixed in source; no PAYPAL_MODE, arbitrary API base URL or live fallback. The existing task policy is unrestricted/enforced; no broader network access was requested. Unauthenticated HTTPS HEAD to the host root returned403. This proves an HTTP response was reachable, not OAuth/API permission. See paypal-network.json.

Required buyer approval destination: **www.sandbox.paypal.com**. The server validates an HTTPS Sandbox approval link returned by PayPal. This implementation uses REST buyer approval links, not a JavaScript SDK script, so no SDK host is required by app code. PayPal's own checkout page may load its assets in the buyer browser; assess additional runtime destinations only if an actual approval session needs them. Certificate URL metadata is restricted to api.sandbox.paypal.com/v1/notifications/certs; Waylatch sends it to the official verification API and does not fetch it itself.

Keep proxy/CA settings and TLS verification. `paypal:auth`, server start and Payouts probe use Node's supported NODE_USE_ENV_PROXY flag. A secret's domain selection is not a general network-access grant.

## Execute genuine OAuth first

1. Bind the two Sandbox app variable names securely to the active cloud environment; recheck presence without printing values.
2. Run `npm run paypal:auth`. It forces a fresh OAuth request to POST /v1/oauth2/token with grant_type=client_credentials.
3. A successful HTTP200 plus sanitized accessTokenReceived=true proves authentication only. It creates no order and is not payment evidence.
4. Retain sanitized JSON, date/time and commit. Do not print a token or raw response body.

## Genuine purchasing workflow

1. Start the production app with coordinator access and durable SQLite. Use a fictional exact-amount resource request, not private incident/claimant data.
2. An authorized person records human review and explicit approval for the exact revision/amount. Browser capture payload accepts only confirmation; server owns approved cents and order ID.
3. Create an actual Sandbox CAPTURE-intent Orders v2 order. Persist the internal operation and stable PayPal-Request-Id before provider calls. Record actual order ID, currency, amount and status; ORDER_CREATED is unpaid.
4. Open the returned Sandbox approval link in a supported browser. Sign in as a Sandbox **personal buyer** separate from the merchant and approve using simulated funds. Do not add a real card, choose lending/Pay Later, send a password through chat, or fake the buyer action. A secure interactive login may need owner participation.
5. Explicitly confirm Sandbox capture. Server inspects authoritative buyer approval, custom_id, USD amount and record revision, calls capture with a stable key, then inspects the authoritative order again. Only one final COMPLETED capture of the approved amount can produce PAID.
6. Inspect/export the hash-linked audit. Real order/capture references must match the authorized request; preserve historical event formatting and hashes.

`npm run paypal:integration` implements the loopback runbook with explicit REVIEW, AUTHORIZE and CAPTURE prompts. It must not receive scripted approval input as a substitute for a human decision. Successful evidence is saved only after COMPLETED order and capture IDs exist. A buyer browser outside cloud may not reach the loopback return URL; buyer approval must still be confirmed by server order inspection. Secure cloud preview/tunneling needs a supported access boundary; no public endpoint is currently configured.

## Failure/retry evidence categories

Local injected doubles and a separate-process HTTP simulator cover unauthorized capture, amount/revision overrides, concurrent duplicate attempts, dropped create/capture responses, stable request IDs, restart recovery, unknown completion, invalid signatures, webhook retries/deduplication and audit tampering. OAuth doubles separately test missing bindings, sanitized success and HTTP401 rejection. These are **simulated provider outcomes**, not real PayPal tests.

Real invalid credentials, invalid order ID, declined buyer approval, interruptions and duplicate capture must be labeled as real only when executed against the actual Sandbox. No real negative-provider test has executed yet. Browser offline conditions are simulated, but browser persistence and packet scanning execute.

## Webhooks — second actual-provider gate

Endpoint: POST /api/webhooks/paypal. No signature means no authoritative state change. Required headers, certificate destination, configured webhook ID and official POST /v1/notifications/verify-webhook-signature SUCCESS are mandatory. Delivery IDs and separate receipt/processed statuses persist. Reconciliation failures remain retryable; authoritative order details control financial state. Local webhook doubles do not prove real signature verification or callback delivery.

The current server binds loopback. No managed cloud HTTPS callback/forwarding capability is configured. A public tunnel or new hosting account was not provisioned; broad payment mutation exposure is not acceptable merely to obtain a callback. Prefer a supported free HTTPS port-forward/private-demo boundary after checking its actual capability and authentication. Otherwise retain local tests and clearly mark real callback receipt blocked. No paid hosting needed for the contest's runnable-repository option.

## Optional Payouts

Retain claim review and human reimbursement approval. `npm run paypal:probe` can test a single 0.01 USD **Sandbox** batch once credentials exist, with existing stable sender_batch_id/request ID retained through rebrand. No probe has executed in this continuation. Merchant app selection alone does not establish Payouts entitlement. If unavailable, record actual permission response and leave payouts blocked; do not fabricate success or switch app types to force functionality.

## Primary documentation

- [PayPal REST authentication](https://developer.paypal.com/api/rest/authentication/)
- [Orders v2](https://developer.paypal.com/docs/api/orders/v2/)
- [Webhook verification API](https://developer.paypal.com/docs/api/webhooks/v1/)
- [Payouts batch API](https://developer.paypal.com/docs/api/payments.payouts-batch/v1/)

These documents describe contracts; current actual-provider evidence remains blocked. All real funds spent: $0.

## Free callback option investigated

Cloudflare's current [Quick Tunnels documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) describes temporary free HTTPS addresses without an account or purchased domain. These have no uptime guarantee. No tunnel is running and cloudflared is not installed in this runtime. A future test should expose a dedicated callback-only gateway, not the entire application or payment endpoints, and retain official signature verification. Interactive email protection cannot protect machine-delivered PayPal callbacks because it requires a browser; it could instead protect a human preview. Current environment TCP grants are empty, so tunnel transport support must be checked through the supported environment workflow. No public callback was provisioned, no paid resource was activated, and no actual delivery is claimed. Purchasing remains the prerequisite milestone.

## Integration harness authorization defect corrected

A separate-process CLI cancellation test reproduced review being recorded before an operator confirmed it. The harness now displays the fictional details and requires REVIEW before writing human_review_completed, AUTHORIZE before purchase approval/order creation, and CAPTURE after actual buyer approval. Two regression tests confirm cancelled review stays pending and cancelled purchase performs zero provider financial calls. All CLI regression evidence uses local doubles, not PayPal.

## Private engineering candidate — latest continuation

The fresh OAuth diagnostic again exited2 with SANDBOX_CREDENTIALS_MISSING, requestExecuted=false and no HTTP status. The purchasing harness also exited2 before any request. Runtime metadata exposes source_config_id=null, no configured secret bindings and no credential-mutation API. The environment ID matches the original session, but no saved-environment publication time or source association can be inspected. See CLOUD_CONTINUATION.md and evidence/cloud-runtime.json; no claim is made that the owner entered invalid PayPal credentials.

The actual integration fixture is now **one fictional test item, quantity1, exact USD1.00**, revision1. Displayed amount, server approval payload and retained evidence derive from the same record. REVIEW, AUTHORIZE and CAPTURE remain mandatory; this task has not supplied those decisions or made a provider operation. Local cancellation tests confirm review/authorization cannot silently proceed.

`npm run webhook:gateway` starts the callback-only listener on 127.0.0.1:4180 and forwards only the exact POST /api/webhooks/paypal route to the configured loopback backend. It accepts bounded uncompressed JSON and bounded required signature headers, preserves callback bytes, strips cookies/Authorization, rejects redirects and returns retryable failure when verification is unavailable. Nine local gateway tests use a local upstream fixture, not PayPal signature verification. Existing backend tests continue to cover actual production verification contracts, event deduplication and retryable reconciliation with labeled doubles.

Cloudflared2026.10.0 was downloaded from its official release and SHA-256 verified. A bounded Quick Tunnel attempt failed at api.trycloudflare.com:443 with TCP connection refused. No tunnel, paid resource, webhook subscription or callback was created. No network/TLS bypass was attempted. Keep all financial mutation endpoints private; do not tunnel the full backend merely to work around this blocker. Real callback testing remains optional after the primary genuine capture milestone.

## Credential diagnosis correction — latest continuation

Freshly checked current official Codex documentation and this actual runtime. Both direct process variables are absent after dotenv; runtime status has no bindings/source-config association. Current cloud environments provide direct Environment variables or proxy-substituted Network secrets; these are distinct fields and must not duplicate keys. The server derives HTTP Basic from the two process values, so the supported unmodified path is **Environment variables → Manage**, not an ambiguous “Secrets” instruction. Placeholder substitution inside derived Base64 is unverified. Legacy setup-only secrets are a separate workflow and must not be copied into persistent files to circumvent phase boundaries. Updated exact selection/Republish/new-task instructions are in CLOUD_CONTINUATION.md. This correction is based on official documentation, not access to the owner's saved editor.

OAuth exited2 with requestExecuted=false; integration exited2 before server requests or operator prompts. No genuine OAuth/order/buyer approval/capture/webhook evidence was generated. The $1.00 fixture and three human gates remain unchanged. The preview remains110.04seconds and honestly incomplete; no provider footage was fabricated. Host-root HEAD403 is only unauthenticated reachability. Evidence: paypal-environment-diagnosis.json, paypal-continuation-network.json and paypal-oauth.json.
