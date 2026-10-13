# External blockers

- PayPal Sandbox client ID/secret and webhook ID are not configured in cloud environment (observed 2026-10-13). Do not paste them into chat; bind them securely to this cloud environment. Real Orders/capture and Payouts entitlement probe cannot execute yet. Independent work continues.
- Unblocked account is not part of an organization; connector unavailable. Authorized GitHub CLI access works.
- Public HTTPS webhook callback not configured. Local signature-rejection/verification tests do not establish real callback receipt.
- Root license adoption, private→public release, public YouTube video, registration/terms and final submission require owner action/approval at release time.

- GitHub private repository creation attempted with authenticated Ledgercorp account: `gh repo create Ledgercorp/RescueLedger --private ...` failed with `GraphQL: Resource not accessible by integration (createRepository)`. No remote exists or was modified. Preserve local committed branch, source archive and Git bundle; supply an authorized private destination or enable repository-create permission. Do not publish or push into unrelated repositories.
