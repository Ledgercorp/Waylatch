# Public release and submission checklist

Engineering may prepare this list without accepting terms or publishing.

- [ ] Actual Sandbox Orders create → buyer approve → capture succeeds via `paypal:integration`; retain sanitized order/capture refs and environment evidence.
- [ ] Probe Payouts entitlement once if keys exist; retain real response. If unavailable, leave blocked. Implement separate payout state machine only with entitlement; do not replace it with a mock.
- [ ] Optional public HTTPS callback: real signature verification and duplicate delivery evidence. Local verification tests remain labeled if no callback exists.
- [ ] Clean installation reproduces build/tests/model download and README flows.
- [ ] Owner confirms rights to adapted CrisisCodec source and copyright holder; approves proposed MIT text.
- [ ] Adopt approved repository-root LICENSE with confirmed copyright; dependency/model notices retained.
- [ ] Inspect all tracked artifacts for secrets/private incident records; only synthetic fixtures and sanitized evidence.
- [ ] Owner explicitly approves making this private repository public. Confirm actual visibility and remote commit after change.
- [ ] Record/publish authorized functioning YouTube demo <3:00; retain accessible public URL.
- [ ] Final project description accurately reflects executed PayPal/AI/offline evidence; technology list complete.
- [ ] Owner confirms eligibility, organization representation, registration and legal terms.
- [ ] Owner explicitly approves final Devpost submission, then confirm submission receipt.

No paid hosting, card, automatic top-up, live PayPal credential, real transfer or paid inference endpoint is needed. The runnable-repository alternative is supported by the official rules.
