# Sandbox endpoint diagnosis — 2026-10-13

Checked the existing private release candidate at `7393ff0a8eb500a9416e91ce6037c1d62948046d`. No application, credential, alias-resolver or payment-gate changes were made.

## Fresh transport evidence

Both requests used the configured HTTP proxy at `http://proxy:8080`, normal TLS verification, no authorization header and no credential values. They initiated no purchase or token-authenticated operation.

| Request                                                                                       | Proxy CONNECT | TLS verification result | HTTP response                         | Meaning                                                                                                                                                    |
| --------------------------------------------------------------------------------------------- | ------------- | ----------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HEAD `https://api-m.sandbox.paypal.com/`                                                      | 200           | 0, successful           | 403                                   | Root HEAD denial; its origin or policy layer is not established.                                                                                           |
| POST `https://api-m.sandbox.paypal.com/v1/oauth2/token`, body `grant_type=client_credentials` | 200           | 0, successful           | 401, JSON containing `invalid_client` | OAuth path responds to a credential-free request as an authentication rejection. This is connectivity evidence, not successful application authentication. |

Current managed runtime observations are current and running/connected, with network policy **unrestricted / enforced**. The local policy snapshot also reports unrestricted HTTP networking. No configured environment HTTP domain allowlist denial is demonstrated. The root403 alone is insufficient to attribute a higher-level managed-network restriction, especially because the exact OAuth POST returned401 rather than403. Both visible response headers identify `server: envoy`; that header alone cannot identify the layer responsible for the root denial. The separate empty TCP grants do not override the observed successful HTTPS proxy route.

Do not change PayPal code, disable TLS verification, bypass the proxy or request broader internet access on the basis of this root response. This probe does not establish buyer-browser access, authenticated API acceptance, webhook delivery or access to other destinations.

## Fresh application authentication diagnostic

`npm run paypal:auth` exited2 with `SANDBOX_CREDENTIALS_MISSING`, `requestExecuted:false`, `authenticated:false`, `httpStatus:null`. Checks after dotenv showed `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` and `PAYPAL_SECRET_KEY` absent. The existing canonical-preferred alias resolver remains correct and unchanged.

The current task's managed instance has no `source_config_id`, requested runtime variables, secret bindings or outbound identities. The available metadata does not establish association with the owner's separately published credential-bearing Waylatch environment. This is the observed execution boundary, not evidence that the owner failed to configure that environment or that a credential is invalid/a network-secret placeholder. No supported task switch or credential binding operation is available in this executor. No key rename, credential regeneration or repeated editor configuration is requested.

## Resume the financial gate

In the credential-bearing task, run the existing `npm run paypal:auth`. A successful real OAuth response is required before the existing USD1.00 fictional procurement workflow. Preserve actual human REVIEW/AUTHORIZE, secure Sandbox buyer approval and explicit CAPTURE. Retain authoritative capture/reconciliation evidence before replacing the preview's financial scene. No markers were supplied and no order, buyer approval, capture, real callback or payout occurred in this check.

## Evidence and release scope

- [Transport observations](evidence/paypal-network-current.json): request methods, exact paths, status, CONNECT status, TLS result and selected safe headers/body markers.
- [Current runtime observations](evidence/paypal-network-runtime.json): configuration/readiness metadata only, no values.
- [Existing OAuth diagnostic](evidence/paypal-oauth.json): sanitized application result at the implementation checkpoint; dirty state reflects newly written transport evidence.

The completed preview and submission package remain preserved. Existing69 local and9 browser passes are historical; no unit/browser/AI/install/build suite was rerun for this diagnostic-only update. Only changed-document formatting and the staged release disclosure scan are appropriate to verify this update. Repository remains private; no publication, license adoption, legal acceptance or submission. Real spending remains $0.

Targeted staged release scan: zero findings across214 tracked files. Changed-document formatting checked before commit. Previous test results were not rerun or relabeled as current.
