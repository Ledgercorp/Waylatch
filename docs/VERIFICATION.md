# Verification ledger

Detailed logs and benchmark JSON: docs/evidence/. Evidence categories must remain distinct.

## Executed real integrations

- GitHub authenticated read: exact CrisisCodec reference commit; original clean. Private RescueLedger synchronization will be recorded after push.
- Real local MiniLM CPU inference: `npm run test:ai`; pinned 384-dimensional q8 model. Synthetic calibration set TP5/FP0/FN1/TN6; no held-out accuracy claim. Benchmark/model hashes in AI_MODEL.md and evidence.
- **No PayPal account transaction, Payouts entitlement result or real webhook callback executed.**

## Executed local/integration tests

- `npm test`: 28 base tests passed; `npm test -- tests/security-review.test.ts tests/payments.test.ts`: 11 passed, including four adversarial regressions. Full integrated total will be refreshed after final hardening.
- `npm run build`: passed (TypeScript + Vite). Minor upstream Zod annotation and 500KB chunk advisories; no build errors.
- `npm run test:e2e`: five passed. Offline request survives actual browser reload; disconnected browser contexts import a real generated QR image plus packet fragments; malformed text fails; coordinator review and approval enforced; credentials missing visibly blocks order creation.
- axe: zero violations in tested Request screens at 1440×1000 and 390×844. Automated checks are not a full manual accessibility certification.
- Independent CrisisCodec disposable copy: 38 unit/integration and seven browser tests passed; source and commit fingerprints retained in evidence.

## Simulated behavior

- PayPal provider response doubles in local tests: OAuth/Orders/capture representations, approval, concurrent retries, mismatched authoritative amount, invalid webhook, verified webhook double, network interruptions. These do not prove PayPal account integration.
- Browser offline conditions are explicitly simulated using Playwright; requests, reload, persistence and QR import execute for real in the browser.
- All incident, identity, organization, vendor and receipt fixtures are fictional.

## Unverified requirements

Actual Sandbox create/buyer approve/capture; real signature-verified callback receipt; Payouts entitlement/reimbursement execution; public repository license/visibility; public YouTube demo; Devpost registration and final submission. Not complete for submission.

## Blockers

See BLOCKERS.md. `npm run paypal:probe` produced BLOCKED_CREDENTIALS_MISSING with exit2 and realMoneyUsed0; no mock payout success.
