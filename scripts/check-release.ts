import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
let sourceMode = 'git-index';
const sourceOnly = process.argv.includes('--source-only');
let tracked: string[];
try {
  tracked = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .split('\0')
    .filter(Boolean);
} catch {
  sourceMode = 'source-archive-runtime-files-excluded';
  const excluded = new Set([
    '.git',
    'node_modules',
    'dist',
    'data',
    'models',
    '.cache',
    'test-results',
    'playwright-report',
  ]);
  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (
        excluded.has(entry.name) ||
        (entry.name.startsWith('.env') && entry.name !== '.env.example')
      )
        return [];
      const path = join(dir, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : [path];
    });
  tracked = sourceFiles('.');
}
const findings: string[] = [];
const secrets = [
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_SECRET_KEY',
  'PAYPAL_CLIENT_ID',
  'COORDINATOR_PASSWORD',
  'GH_TOKEN',
  'GITHUB_TOKEN',
]
  .map((k) => process.env[k])
  .filter((s): s is string => !!s && s.length >= 12);
for (const file of tracked) {
  if (/(^|\/)(\.env(?:\.|$)|data\/|models\/)/.test(file) && file !== '.env.example')
    findings.push('unexpected tracked sensitive artifact: ' + file);
  const data = readFileSync(file);
  const text = data.toString('utf8');
  if (secrets.some((s) => text.includes(s)))
    findings.push('configured secret appears in tracked file: ' + file);
  if (/gh[opusr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))
    findings.push('credential pattern in tracked file: ' + file);
}
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((x) =>
    x.isDirectory() ? files(join(dir, x.name)) : [join(dir, x.name)],
  );
}
for (const file of sourceOnly ? [] : files('dist')) {
  const text = readFileSync(file, 'utf8');
  if (
    /PAYPAL_CLIENT_SECRET|PAYPAL_SECRET_KEY|COORDINATOR_PASSWORD|api-m\.sandbox\.paypal\.com|verify-webhook-signature/.test(
      text,
    ) ||
    secrets.some((s) => text.includes(s))
  )
    findings.push('server credential/provider code in frontend artifact: ' + file);
}
console.log(
  JSON.stringify({
    category: 'local-static-release-check',
    trackedFiles: tracked.length,
    sourceMode,
    frontendArtifactsChecked: !sourceOnly,
    findings,
    scope:
      (sourceOnly ? 'Source only; frontend artifacts not inspected in this run. ' : '') +
      'Configured-secret and specific-pattern scan; not a comprehensive secret/security certification',
  }),
);
if (findings.length) process.exitCode = 1;
