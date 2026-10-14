import express from 'express';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createApp } from '../server/app';
import { clearPayPalEnvironment, createJudgeRuntime } from '../server/judge-demo';
import type { PayPalProvider } from '../server/paypal';
import { MODEL_ASSETS } from '../src/risk/model-assets';
import { MODEL_ID, disposeModel } from '../src/risk/model';

// No dotenv import: this launcher deliberately ignores normal passwords, databases and provider configuration.
clearPayPalEnvironment();
const evidenceOnly = process.argv.includes('--evidence-only');
async function modelReady() {
  try {
    for (const asset of MODEL_ASSETS) {
      const bytes = await readFile(
        resolve(process.env.RESCUELEDGER_MODEL_PATH || 'models', MODEL_ID, asset.file),
      );
      if (
        bytes.length !== asset.bytes ||
        createHash('sha256').update(bytes).digest('hex') !== asset.sha256
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
if (!evidenceOnly && !(await modelReady())) {
  console.log(
    'The pinned local CPU model is missing or failed integrity checks. Running the existing verified downloader.',
  );
  const code = await new Promise<number | null>((resolveDownload, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/download-model.ts'], {
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', resolveDownload);
  });
  if (code !== 0 || !(await modelReady()))
    throw new Error(
      'Real local AI assets are unavailable. Restore access to the pinned Hugging Face assets and rerun npm run judge; no simulated AI fallback is used.',
    );
}
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be an integer from 1 to 65535');
const origin = `http://127.0.0.1:${port}`;
const directory = await mkdtemp(join(tmpdir(), 'waylatch-judge-'));
const runtime = createJudgeRuntime(directory);
const blocked = async (): Promise<never> => {
  throw new Error('Judge demo provider operations are disabled');
};
const paypal: PayPalProvider = {
  configured: false,
  createOrder: blocked,
  captureOrder: blocked,
  getOrder: blocked,
  verifyWebhook: blocked,
};
const app = createApp({
  store: runtime.store,
  password: runtime.password,
  paypal,
  origin,
  judgeMode: true,
  judgeArchive: runtime.archive,
  judgeEvidenceOnly: evidenceOnly,
});
app.use(
  express.static(resolve('dist'), {
    setHeaders: (res, path) =>
      res.setHeader('Cache-Control', path.endsWith('sw.js') ? 'no-cache' : 'public, max-age=300'),
  }),
);
app.get('/', (_req, res) => res.sendFile(resolve('dist/index.html')));
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Waylatch judge demo: ${origin}`);
  console.log(
    evidenceOnly
      ? 'EVIDENCE-ONLY MODE: AI assets are not required. Review reports its actual inference mode; no genuine AI success is claimed. Financial operations are blocked.'
      : 'Fictional requests · real local CPU AI · separate saved historical Sandbox proof. Financial approvals and provider operations are blocked.',
  );
  console.log(
    'Use the on-screen Start judge demo button. No coordinator passphrase is printed or persisted.',
  );
});
let stopping = false;
async function cleanup() {
  if (stopping) return;
  stopping = true;
  runtime.store.close();
  await disposeModel();
  await rm(directory, { recursive: true, force: true });
}
server.once('error', () => {
  void cleanup().finally(() => {
    console.error(
      'Could not bind the loopback judge port. Stop the other instance or set PORT to a free local port.',
    );
    process.exitCode = 1;
  });
});
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () =>
    server.close(() => {
      void cleanup().finally(() => process.exit(0));
    }),
  );
