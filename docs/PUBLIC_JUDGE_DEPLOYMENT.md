# Public interactive judge deployment

The deployment uses the existing Waylatch React application, guided workflow, QR protocol,
review engine and Proof Trail. It is a fictional demonstration, not a production service.
Public-host verification and the final URL will be recorded after acceptance succeeds.

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

Render deployments opt into its appended final X-Forwarded-For address only when
`RENDER=true`. Other deployments ignore forwarded addresses. This assumes Render's public edge
and its Free service's lack of private ingress; hosted spoofing checks verify this boundary.
The initial first-address assumption failed live testing and was corrected before linking the demo.

## Free hosting and recovery

Candidate configuration: Render Hobby workspace, Free Docker Web Service, Virginia,
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
Render supports rollback to its two previous deployments. Before a first successful deployment,
stop/suspend the failed service and retain the original local `npm run judge` instructions.
Never publish a failed or fallback-only deployment as a verified full AI demonstration.

Sources checked October 14, 2026:
[Render free compute](https://render.com/docs/free),
[pricing](https://render.com/pricing),
[edge and IP handling](https://render.com/articles/how-render-handles-ddos-attacks),
[health checks](https://render.com/docs/health-checks).
