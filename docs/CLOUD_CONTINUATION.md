# Exact Waylatch cloud continuation

## Latest runtime diagnosis — 2026-10-13

The task still uses the original thread environment ID. Safe status has source_config_id=null, source_config_version_id=null, runtime_variables=[] and secrets=[]. PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are absent both before and after the app's dotenv loading. The latest OAuth diagnostic at baseline7b3d1c32e962d5944de2247b30a770e55888790e exited2 before a request. This establishes missing task configuration, not invalid PayPal credentials. The saved editor contents/publication time cannot be inspected here. The installed Codex CLI supports cloud task submission, but its read-only task listing failed with unavailable authentication; it cannot select/start the saved environment from this runtime. The cloud-status connector is read-only.

## Correct configuration field

The current [official cloud guide](https://learn.chatgpt.com/docs/environments/cloud-environments#configure-environment-variables-and-network-secrets) distinguishes direct **Environment variables** from proxy-substituted **Network secrets**. Waylatch's unmodified server computes HTTP Basic authorization from the client ID/secret in process. Use the exact expected keys as direct **Environment variables**, supplied through the private environment configuration or requested personal environment-variable values. Never put a real secret in source, a setup export, .bashrc, screenshots, reports or chat. Support for substituting network placeholders inside this derived Base64 header has not been established; do not claim it works or copy raw secrets out of a proxy/vault.

The earlier phrase “Environment-scoped Secrets” was ambiguous and is superseded by this exact field distinction. The [legacy guide](https://learn.chatgpt.com/docs/environments/cloud-environment) describes setup-only secrets removed before the agent phase; that guidance must not be confused with the current web/mobile/desktop environment workflow.

## Account-controlled correction

In **Settings → Codex Cloud → Environments → Waylatch → Edit**, verify **Environment variables → Manage** requests/provides PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET. If values are personal, their keys/type and Applies to must match this environment's requests. Keep the environment private. Do not create a duplicate network-secret entry with the same key. Save/Republish. Start a new task via **Work in → Cloud → Waylatch** on feat/waylatch-release-candidate; sending another prompt to this existing task does not select a different published environment. Existing tasks retain their own saved state. Do not reset caches or regenerate PayPal credentials solely because this task lacks bindings.

Ensure **Allow Codex to access internet** permits api-m.sandbox.paypal.com. A credential setting and a network grant are separate. Latest unauthenticated HEAD returned403, confirming host reachability only. Buyer approval uses www.sandbox.paypal.com. PAYPAL_WEBHOOK_ID is configured only after a real Sandbox subscription exists. No live PayPal destination is needed.

## Continuation prompt

> Continue Ledgercorp/Waylatch on feat/waylatch-release-candidate at the latest verified private remote SHA. Read docs/PROJECT_STATE.md, docs/CLOUD_CONTINUATION.md, docs/PAYPAL_SANDBOX_INTEGRATION.md and docs/VERIFICATION.md. Preserve existing source/history; do not recover/rebrand/rebuild again. Check safe environment association/readiness and exact variable-name presence without values. Inspect then run npm run paypal:auth. If successful, prepare the existing fictional USD1.00 procurement, preserve REVIEW/AUTHORIZE/CAPTURE and obtain one consolidated actual human review/authorization before creating an order. Use a secure Sandbox personal-buyer session, never request credentials in chat, and capture only after genuine buyer approval and explicit confirmation. Retain authoritative sanitized references, reconcile and verify idempotency. Use the callback-only gateway only through a safe free route. Replace the blocked video scene with actual capture footage, retain simulation labels, and rerun relevant checks. Spend $0; keep source private. Final licensing/publication/legal submission requires explicit approval.

Existing scripts: paypal:auth, paypal:integration, webhook:gateway, demo:record/demo:render, release:check. The demo recorder disables PayPal and uses labeled automated fixtures; it does not satisfy the human financial gates. No background task is scheduled by this document.
