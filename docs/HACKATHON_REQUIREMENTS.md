# Official qualification and release gates

Live official pages retrieved on 2026-10-13 with successful HTTP responses, before product implementation:

- https://paypalaihackathon.devpost.com/rules
- https://paypalaihackathon.devpost.com/resources

Devpost connector returned internal errors; direct official public pages supplied readable rules. No registration or agreement acceptance performed.

Official deadline: **November 12, 2026, 12:00 PM Pacific (PST), 20:00 UTC**. Submission period began October 1. Eligibility/representation must be confirmed by owner; engineering does not establish personal eligibility.

Relevant exact official text:

> “Entrants must build or update an application that integrates the PayPal developer platform (using the free sandbox environment) along with an AI tool, model, or platform of their choice (each a ‘Project’).”

> “Any AI tool works, as long as PayPal integration is central to the project.”

> “Your project does not need to be publicly hosted or deployed — but judges must be able to actually run or interact with a working build.”

> “The repository must be public and open source by including an open source license file.”

> “should be less than three (3) minutes. Judges are not required to watch beyond three minutes”

> “must be uploaded to and made publicly visible on YouTube”

> “Projects must be either newly created by the Entrant or, if the Entrant’s Project existed prior to the Hackathon Submission Period, must have been significantly updated after the start of the Hackathon Submission Period.”

The five equally weighted judging criteria are Technological Implementation, Design, Potential Impact, Innovation/Idea, Presentation. Target overall, Most Impactful, Best Use of PayPal + AI, Best Demo Delivery; no claim of award eligibility or likely win. Public runnable repository is our intended demo route; hosting is optional.

Resources explicitly link PayPal REST API, Checkout, JavaScript SDK v6, Sandbox, Payouts and Webhooks. Waylatch uses the official REST route and browser buyer approval links; an SDK is not necessary for the specified Orders v2 workflow. Live API, credit, Pay Later, lending and autonomous financial authorization are excluded.

## PayPal primary references inspected

- https://developer.paypal.com/docs/api/orders/v2/ — create, show order details, capture; PayPal-Request-Id and Sandbox request examples.
- https://developer.paypal.com/docs/api/webhooks/v1/ — POST /v1/notifications/verify-webhook-signature, exact verification fields.
- https://developer.paypal.com/docs/api/payments.payouts-batch/v1/ — batch payout creation / sender_batch_id and status.
- OAuth endpoint: https://api-m.sandbox.paypal.com/v1/oauth2/token

Every API URL is fixed to Sandbox in the provider implementation. Browser buyer approval is required; callback URL alone cannot confirm payment. Payouts entitlement probe cannot run without credentials. No provider evidence has yet been produced from a real account.

## Final release checklist

- [ ] Owner confirms participant eligibility, organization representation, source ownership and registration/legal terms.
- [ ] Real Sandbox purchase and capture evidenced; repeatable integration harness succeeds.
- [ ] Real local AI evidence and limitations included.
- [ ] README verified from clean install; model download completed before offline AI demonstration.
- [ ] Root license approved and adopted, reused/private source rights confirmed.
- [ ] Owner authorizes repository visibility change to public; inspect secrets/assets first.
- [ ] Public YouTube video under 3 minutes, functioning product footage, authorized music/trademarks only.
- [ ] Project description, technology list, screenshots and demo access instructions complete.
- [ ] Owner approves final Devpost submission; no autonomous registration/submission.

Recheck rules immediately before submission because the host may amend them. Do not commit Sandbox secrets or buyer credentials despite broad testing-access language; provide secure access instructions and scoped accounts.

## Continuation recheck — 2026-10-13

The official rules/resources and current PayPal OAuth/Orders/webhook API pages were fetched again with HTTP200. The November12 deadline, Sandbox/AI focus, five judging criteria, runnable-build option, public licensed code and public YouTube video under three minutes remain present. No material requirement change was identified in the inspected sections. Sanitized fetch dates/statuses/content fingerprints: docs/evidence/waylatch-official-docs-checks.json. No registration or terms acceptance occurred.
