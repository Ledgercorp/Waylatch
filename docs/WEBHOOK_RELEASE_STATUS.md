# Sandbox webhook release status

Checked 2026-10-13 at 20:59:55 UTC. The genuine Sandbox capture is complete, but genuine webhook delivery, official signature verification and real duplicate delivery remain unverified. This optional callback evidence does not invalidate the separately verified Sandbox order/capture or its seven-event audit.

## Actual provider inspection

The existing Sandbox credentials authenticated successfully (OAuth HTTP 200), using the server resolver's `PAYPAL_SECRET_KEY` fallback. Credentials were neither changed nor logged. Read-only requests used the inherited proxy, `NODE_USE_ENV_PROXY=1` and verified TLS.

| Request                                 | Actual result                       | Meaning                                                                                                                                                                      |
| --------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/notifications/webhooks`        | HTTP 200; zero registrations        | This credential's Sandbox application currently has no registered callback.                                                                                                  |
| `GET /v1/notifications/webhooks-events` | HTTP 200; zero events; no next page | No `PAYMENT.CAPTURE.COMPLETED` notification was returned for 20:16:49–20:44:07 UTC, covering the known order/capture. This does not imply that the financial capture failed. |

The inspected transaction is order `2W330508JA572391V`, capture `8WY07860808872629`, USD 1.00 simulated funds; real spending remains USD 0.00. Raw provider resources, payer data, tokens and callback URLs are omitted from the evidence.

The first event-list query used fractional-second timestamps and returned HTTP 400. A corrected query using whole-second timestamps returned HTTP 200. Both attempts are preserved; the initial rejection is not treated as a successful event inspection.

## New narrow local verification

`scripts/verify-sandbox-webhooks.ts` copied the genuine paid SQLite database to a temporary directory and ran the existing application, real `PayPalClient` and existing callback gateway. The callback body was explicitly synthetic and only referenced the genuine order/capture identifiers. No genuine PayPal transmission headers or provider double were used.

| Check                                                                | Result                                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Unsigned callback directly to the backend                            | HTTP 400                                                                                      |
| Unsigned callback to the gateway                                     | HTTP 400                                                                                      |
| Synthetic required signature headers through gateway to real backend | HTTP 400; missing webhook ID fails closed before a verification API request or reconciliation |
| Copied records, payments, audit and webhook markers                  | Identical SHA-256 snapshots before/after                                                      |
| Copied payment and audit                                             | `PAID`; genuine order/capture references unchanged; seven-event audit valid                   |

The original database was never opened by the diagnostic and was not modified. Temporary listeners and files were cleaned up. These results prove rejection of unauthenticated callbacks against the existing paid state; they do not prove a genuine signature, callback delivery or signed duplicate handling.

The previously completed nine gateway tests remain historical local fixture evidence in `paypal-alias-local-tests.log`. They cover bounded byte/header forwarding without browser credentials, route isolation, missing/oversized headers, JSON/body bounds, upstream rejection/failure, loopback upstream validation and redirect refusal. The existing payment/security/HTTP simulator tests cover webhook rejection, retry and deduplication with fixtures. Those completed suites were not rerun for this follow-up. TypeScript checking of the new script completed successfully; no application rebuild was performed.

## Exact remaining boundary

`PAYPAL_WEBHOOK_ID` is absent; PayPal reports zero existing application webhook registrations. No actual notification body plus authentic transmission headers is available. Listing provider events cannot supply a received callback's authentic transmission signature headers. Consequently the official `verify-webhook-signature` operation cannot be honestly demonstrated for this capture.

The current enforced cloud policy permits `api-m.sandbox.paypal.com`, provides zero TCP domain/IP grants and has no configured VPN. The prior Cloudflare Quick Tunnel attempt failed before creating an endpoint. No identical tunnel attempt, alternative public resource or network-policy bypass was attempted. Existing application and gateway implementations were unchanged.

A genuine callback test requires a permitted HTTPS endpoint for the callback-only gateway, a Sandbox registration owned by this application, its webhook ID in server configuration, and an authentic delivery. Duplicate evidence must repeat that genuine delivered event through the verified backend. None of these prerequisites were fabricated or substituted with the synthetic rejection checks. No subscriptions, payouts, orders, captures, paid resources, public publication or submission were created by this diagnostic.

Evidence:

- [Final selected provider/local results](evidence/release-webhook-verification.json) and [execution log](evidence/release-webhook-verification.log).
- [Initial timestamp-query results](evidence/release-webhook-initial-query.json) and [initial execution log](evidence/release-webhook-initial-query.log).
- [TypeScript check](evidence/release-webhook-typecheck.log).
- [Historical gateway tests](evidence/paypal-alias-local-tests.log) and [prior tunnel boundary](evidence/webhook-tunnel.json).
- [Genuine Sandbox transaction](evidence/paypal-real-sandbox.json) and [independent seven-event audit validation](evidence/paypal-sandbox-audit-validation.json).

Reproduce the read-only diagnostic, without financial/provider registration mutations:

```sh
NODE_USE_ENV_PROXY=1 npx tsx scripts/verify-sandbox-webhooks.ts
```
