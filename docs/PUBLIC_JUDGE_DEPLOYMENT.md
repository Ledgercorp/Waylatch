# Public interactive judge deployment

The deployment uses the existing Waylatch React application, guided workflow, QR protocol,
review engine and Proof Trail. It is a fictional demonstration, not a production service.
Live HTTPS acceptance completed in Codex Cloud on October 14, 2026.

**Interactive demo:** https://waylatch-judge.onrender.com

**Exact deployed application commit:** `10a46fb48c190cd92d3a18240cc8b45524c1f7af`.
Render deployment `dep-db7q33jbc2fs7383c12g` became live at 15:38:07 UTC on the existing
service `srv-db7oqufavr4c73919bp0`. The later README/evidence commit preserves this application
source; manual deployment remains enabled and the accepted application is not redeployed for
documentation alone.

## Hosted acceptance results

[Browser acceptance](evidence/public-demo-live.json) passed at 15:50:33 UTC against the deployed
commit, using Chromium at desktop 1440×1000 and mobile 390×844 layouts. The run preserved an
offline request across reload, decoded an actual QR image, restored partial receiver state,
reconstructed 14 packets, ignored duplicates and verified that reconnect alone did not upload.
Explicit coordinator transfer, real CPU MiniLM inference, a human pair disposition, valid
fictional/historical chains, sanitized exports and isolated reset all passed. Inference batches
increased from 12 to 13; the review returned `semantic-local`. Five accessibility scenes had
zero axe violations and no page overflow. Browser network emulation and automated accessibility
are bounded checks; prolonged uptime and physical mobile devices were not evaluated.

[Hosted security acceptance](evidence/public-demo-live-security.json) passed. A third session
with a forged forwarded address returned 429; four additional forwarded-header variants stayed
blocked. The cookie flags, unauthenticated/forged-cookie rejection, exact Origin/cross-site checks,
48 KB body boundary, generic validation errors and private source/model file protection passed.
All 21 authenticated/unauthenticated financial/provider route probes returned 403, including
encoded and case variants. Storage stopped at 16 fictional records with zero payments. A bounded
six-request CPU burst observed 503 while busy and genuine local inference on successful replies.
Two client requests can arrive sequentially and both succeed; the retained
[exploratory overlap probe](evidence/public-demo-live-concurrency-probe.json) records that
inconclusive attempt without presenting it as a failed concurrency guard.

[Rotating-header rate test](evidence/public-demo-live-rate-limit.json): 130 distinct forged
header sets in one minute produced exactly 120 HTTP 200 replies and ten HTTP 429 replies with
Retry-After. [Additional edge-header probes](evidence/public-demo-live-edge-headers.json) rejected
forged public IPv4 and IPv6 Cloudflare client addresses with 403. The
[original hosted failure](evidence/public-demo-live-security-before-fix.json) remains separate.
The regression failed before the correction; all 39 focused local tests and the production
TypeScript/Vite build passed after it.

Two independent browser contexts could not read/export or modify each other's records. Resetting
one left the other unchanged; reset credentials returned 401. Fixed-lifetime expiry is covered by
the focused local tests. The original seven-event
Sandbox archive and capture `8WY07860808872629` were displayed and validated without a provider
inspection, purchase or capture. MIT, the submitted project/story, YouTube/video assets and frozen
scientific evidence remain unchanged. No AI evaluation or payment operation was rerun. Devpost
was not edited. The URL is suitable to link as this fictional interactive judge demo.

## Reproduce

Build the root `Dockerfile` and run it with `APP_ORIGIN` set to its exact public HTTPS origin
and `PORT=10000`. For local development only, `http://localhost:10000` is accepted.
The image uses pinned Node 24.19.0 and the existing dependency lockfile. Build-time provisioning
verifies all seven pinned MiniLM assets. Runtime inference is CPU-only, local-only, and never
contacts an inference service. No merchant configuration, historical database, environment
file, model cache from the working tree, private recording or Git history is copied into the image.
Apache-2.0 model attribution and dependency licenses remain independent of the root MIT license.

Run `npm test` and `npm run build`. Public browser acceptance uses
`WAYLATCH_DEMO_URL=<origin> npx playwright test --config playwright.public-demo.config.ts`.
These checks write new public-demo evidence; they do not overwrite frozen evaluation receipts.

The cloud continuation used the focused security/persistence/proof suite (39 tests), not an AI
evaluation or payment run. Hosted API checks use `NODE_USE_ENV_PROXY=1 WAYLATCH_DEMO_URL=<origin>
node --import tsx scripts/public-demo-security.ts` followed separately by
`scripts/public-demo-rate-limit.ts`. Set `WAYLATCH_DEPLOYED_COMMIT` from Render's confirmed live
deployment to bind receipts. In proxy-based cloud environments, set `WAYLATCH_TEST_PROXY` to the
inherited HTTPS proxy and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to the installed Chromium path. Run
rate saturation separately, then wait for the next minute before browser acceptance. Each run
releases only its own fictional sessions.

## Boundaries

Each anonymous visitor receives a secure, HttpOnly, SameSite=Strict, host-only cookie and a
separate ephemeral in-memory SQLite store, seeded with fictional examples. Fixed session
expiry is one hour. Reset closes only that store and clears that browser's outbox and QR receiver.
Server restart or host sleep ends all server sessions; browser preservation remains local
until expiry or reset. Visitors should use fictional information only.

The public server exposes only demo bootstrap/reset, read-only metadata/state, request
creation, advisory assessment and human review dispositions. Financial/provider routes are
denied before authentication and have a second existing judge guard; no PayPal client is created.
Historical payment evidence is loaded from four sanitized, whitelisted files and shown separately.
Strict Host and Origin checks, cross-site request rejection, generic errors and a 48 KB body
limit apply. Production authentication remains unchanged.

Limits: 12 active visitors, two per source IP, 16 records and 64 audit events per session,
512 KB SQLite page allocation, 120 API requests/minute per IP, 20 mutations/minute per session,
three AI reviews/minute per session, and only one admitted inference at a time. Busy inference
fails promptly with a retry response. Global request/session-start limits and bounded rate maps
remain effective independently of forwarded IP headers. Aborted assessment remains reserved
through audit append; reset and cleanup cannot close a store while work remains active.

Render deployments opt into Cloudflare's edge-owned `CF-Connecting-IP` only when
`RENDER=true`. Other deployments ignore forwarded headers. Missing/invalid client-IP headers
fall back to the socket address; `X-Forwarded-For`, `Forwarded` and `X-Real-IP` never select a
rate bucket. This trust is specific to Render's Cloudflare public ingress and this Free service's
lack of private ingress. It must be reconsidered before using another host or enabling private
ingress. Hosted tests exercise that boundary.

Both the initial first-address assumption and commit `18909a8`'s final-address assumption
failed live testing. Cloud resumption observed caller prefixes followed by the stable Cloudflare
client identity and two proxy hops, including a rotating final internal address. The final-address
key admitted a third same-source session. An isolated regression reproduces that failure;
the correction uses the stable edge-owned identity and removes temporary opaque diagnostic logs.
No raw addresses or session cookies were recorded by those diagnostics.

## Free hosting and recovery

Existing service: Render Hobby workspace, Free Docker Web Service, Virginia,
0.1 CPU / 512 MB, one instance, no disk, no database and no payment method.
The authenticated workspace confirmed 750 instance hours, 5 GB outbound bandwidth and 500
pipeline minutes per month. No card and no pending charges were present before provisioning.
Without a payment method, exhausting these quotas suspends service or builds instead of charging.

Free services sleep after 15 minutes without inbound traffic. The next request normally waits
about one minute for startup. Ephemeral sessions disappear on sleep/restart. There is no uptime
guarantee; quotas and provider maintenance can interrupt judging. This is an ongoing free
allocation, not a trial, and has no documented fixed expiration. Do not add a card, upgrade,
attach paid storage or enable paid services to resolve capacity issues.

The existing competitive release remains the rollback baseline. Deployment changes are prepared
on `feat/waylatch-public-judge`; the public default branch is updated only after live acceptance.
Render supports rollback to its two previous deployments. The immediately previous diagnostic
deployment retains the incorrect final-hop assumption and must not be used as an accepted demo.
Before a first successful deployment,
stop/suspend the failed service and retain the original local `npm run judge` instructions.
Never publish a failed or fallback-only deployment as a verified full AI demonstration.

Sources checked October 14, 2026:
[Render free compute](https://render.com/docs/free),
[pricing](https://render.com/pricing),
[edge and IP handling](https://render.com/articles/how-render-handles-ddos-attacks),
[Cloudflare request headers](https://developers.cloudflare.com/fundamentals/reference/http-request-headers/),
[health checks](https://render.com/docs/health-checks).
