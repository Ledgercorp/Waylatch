# Codex Cloud: saved Waylatch environment versus runtime policy

Prepared 2026-10-13, 19:38 UTC. **Draft for OpenAI support; not sent.** Repository: private `Ledgercorp/Waylatch`, branch `feat/waylatch-release-candidate`, diagnostic baseline `a595a99751506e1ffae073e0ed4c2ef0d9e36417`. No credentials or credential values are included.

## Problem

The owner identifies saved environment **79e2602645508191bbaa0e5bd232597f**, **revision13**, and reports a **proxy CONNECT403** despite already adding `api-m.sandbox.paypal.com`. The supplied screenshot clearly shows internet access enabled, **Package managers** selected, and that exact additional allowed domain. Please investigate configuration-to-task attachment and enforcement; this is not a request to add the hostname again.

## Evidence comparison

| Layer                   | Available non-sensitive evidence                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Saved environment       | ID/revision are owner-provided. Screenshot confirms the requested internet/domain settings. It does not show publication status, save/publication time, ID or revision. No available tool can inspect that saved draft, published revision or history.                                                                                                                           |
| Thread-managed instance | Runtime tool returns `ccarenv_b64_Y2NhcmVudl9kOGJmM2Y0YmFlMjg4MTkxOTUxMTE4YTY0MTY3YWZkYg` (decoded: `ccarenv_d8bf3f4bae288191951118a64167afdb`), requested/observed spec revision **68**, observations current, running/connected. `source_config_id` and `source_config_version_id` are null. Its revision is not established as the same version sequence as saved revision13. |
| Runtime HTTP policy     | Current tool reports **unrestricted / enforced**. Selected executor's `/etc/codex/network-policy.json` also reports unrestricted HTTP through `http://proxy:8080`. TCP proxy is `http://proxy:8088`, separate TCP grants are empty, VPN is not configured. No policy files were changed.                                                                                         |
| Workspace policy        | No workspace/global Agent Security inspection tool is available. Workspace membership, applicable policy and denial provenance cannot be established. Unrestricted environment HTTP policy does not waive platform protections.                                                                                                                                                  |

The runtime tool explicitly describes the thread's managed instance; it does **not** inspect extra attached environments or the latest editable draft. Therefore the different ID and missing source association identify an unresolved mapping, not proof that the owner selected the wrong environment. Available Codex CLI commands inspect tasks, not saved environment publication/network history.

## Transport and authentication evidence

At **19:06:46 UTC**, credential-free requests through the configured proxy, with TLS verification enabled, recorded:

- HEAD Sandbox root: **CONNECT200**, then **HTTP403**.
- POST `/v1/oauth2/token`, body `grant_type=client_credentials`: **CONNECT200**, then **HTTP401**, JSON containing `invalid_client`.
- Both curl exits0 and TLS verification results0. Safe visible server header: `envoy`.

These executor observations are **not CONNECT403**. The owner's reported CONNECT403 must remain separately attributed until its originating task/executor log is available. Do not merge an HTTP403 after CONNECT200 with a CONNECT403 denial before TLS.

At **19:06:55 UTC**, existing `npm run paypal:auth` exited2: `SANDBOX_CREDENTIALS_MISSING`, `requestExecuted:false`, `httpStatus:null`. This executor's after-dotenv presence checks found neither client ID nor either supported secret variable. No authenticated Sandbox OAuth request succeeded. No application code, credentials or financial gates were changed; no purchase occurred.

## Diagnosis and support request

**Root cause unresolved.** Stale publication, a different task attachment, saved-but-unapplied settings and a higher-level restriction cannot be conclusively separated with current access. No actual HTTP allowlist block is demonstrated on this executor's OAuth path.

Please inspect:

1. Whether revision13 of environment79e2602645508191bbaa0e5bd232597f was published, and its publication/application timestamps and resolved domain policy.
2. Which saved/published environment revision the affected task and selected executor actually use, including their mapping to the thread-managed instance above.
3. The originating CONNECT403 proxy decision, target hostname, applicable policy layer and non-sensitive denial reason; reconcile it with this executor's CONNECT200 evidence.
4. Any workspace/global managed-network restrictions or credential-binding readiness failures affecting that task.

Attachments: `docs/evidence/openai-support-runtime.json`, `paypal-network-current.json`, `paypal-network-runtime.json`, `paypal-oauth.json`, and the owner's settings screenshot from this conversation. Sanitized JSON contains metadata only. No new configuration, credential regeneration, proxy bypass, code changes or unrelated test reruns are requested. The issue is **not fixed** until genuine authenticated Sandbox OAuth succeeds. Real spending: **$0**.

References: [cloud environment publication and Agent Security](https://learn.chatgpt.com/docs/environments/cloud-environments); cloud-runtime skill documentation distinguishes thread instance, attached executor and saved draft.
