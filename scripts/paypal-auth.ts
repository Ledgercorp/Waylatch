import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PayPalClient, ProviderError } from '../server/paypal';
import { paypalConfigFromEnv } from '../server/paypal-config';
let implementationCommit: string | null = null;
let worktreeDirty: boolean | null = null;
try {
  implementationCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  worktreeDirty = !!execFileSync('git', ['status', '--porcelain'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  /* Unpacked source is reproducible without a Git directory. */
}
const variables = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] as const;
const config = paypalConfigFromEnv();
const missing = variables.filter((key) =>
  key === 'PAYPAL_CLIENT_ID' ? !config.clientId : !config.clientSecret,
);
const evidence: { [key: string]: unknown } = {
  checkedAt: new Date().toISOString(),
  implementationCommit,
  worktreeDirty,
  environment: 'sandbox',
  host: new URL(PayPalClient.base).hostname,
  path: '/v1/oauth2/token',
  credentialVariables: [...variables],
  acceptedSecretVariables: ['PAYPAL_CLIENT_SECRET', 'PAYPAL_SECRET_KEY'],
  fallbackAliasSelected: !process.env.PAYPAL_CLIENT_SECRET && !!process.env.PAYPAL_SECRET_KEY,
  missingVariables: missing,
  requestExecuted: false,
  authenticated: false,
  httpStatus: null,
  providerResponse: null,
};
if (missing.length) {
  evidence.category = 'blocked-configuration';
  evidence.code = 'SANDBOX_CREDENTIALS_MISSING';
  process.exitCode = 2;
} else {
  evidence.requestExecuted = true;
  try {
    const client = new PayPalClient(config);
    const result = await client.authenticate();
    evidence.category = 'executed-real-paypal-sandbox-oauth';
    evidence.authenticated = true;
    evidence.httpStatus = result.httpStatus;
    evidence.providerResponse = { accessTokenReceived: true };
  } catch (error) {
    evidence.category = 'failed-sandbox-oauth-attempt';
    evidence.httpStatus = error instanceof ProviderError ? error.status : null;
    evidence.code = error instanceof ProviderError ? error.code : 'CONNECTIVITY_OR_RESPONSE_ERROR';
    process.exitCode = 2;
  }
}
mkdirSync('docs/evidence', { recursive: true });
writeFileSync('docs/evidence/paypal-oauth.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence));
