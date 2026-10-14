import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export function requireNode24(version = process.versions.node) {
  if (!(Number(version.split('.')[0]) >= 24))
    throw new Error('The judge demo requires Node 24 or newer.');
}
export function judgeArguments(args) {
  if (args.some((arg) => arg !== '--evidence-only') || args.length > 1)
    throw new Error('Unknown judge option. Supported: --evidence-only');
  return args;
}
export function judgeEnvironment(environment = process.env) {
  const clean = { ...environment };
  for (const key of [
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'PAYPAL_SECRET_KEY',
    'PAYPAL_WEBHOOK_ID',
    'COORDINATOR_PASSWORD',
    'DATABASE_PATH',
    'APP_ORIGIN',
  ])
    delete clean[key];
  return clean;
}
function sourceFiles(root) {
  const files = [];
  const walk = (relative) => {
    const absolute = join(root, relative);
    if (!existsSync(absolute)) return;
    if (statSync(absolute).isDirectory()) {
      for (const entry of readdirSync(absolute).sort()) walk(join(relative, entry));
    } else files.push(relative);
  };
  for (const path of [
    'src',
    'server',
    'scripts',
    'public',
    'index.html',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
  ])
    walk(path);
  return files.sort();
}
export function sourceFingerprint(root) {
  const digest = createHash('sha256');
  for (const file of sourceFiles(root))
    digest
      .update(file)
      .update('\0')
      .update(readFileSync(join(root, file)))
      .update('\0');
  return digest.digest('hex');
}
export function productionBuildNeeded(root) {
  const index = join(root, 'dist/index.html');
  if (!existsSync(index)) return true;
  const stamp = join(root, 'dist/.judge-source-sha256');
  if (existsSync(stamp)) return readFileSync(stamp, 'utf8').trim() !== sourceFingerprint(root);
  // Reuse a production build made outside this launcher when it is newer than its inputs.
  return sourceFiles(root).some(
    (file) => statSync(join(root, file)).mtimeMs > statSync(index).mtimeMs,
  );
}
export function stampProductionBuild(root) {
  writeFileSync(join(root, 'dist/.judge-source-sha256'), sourceFingerprint(root) + '\n');
}
async function run(command, args, root, environment) {
  await new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd: root, env: environment, stdio: 'inherit' });
    const stop = (signal) => child.kill(signal);
    const interrupt = () => stop('SIGINT');
    const terminate = () => stop('SIGTERM');
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', terminate);
    const remove = () => {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', terminate);
    };
    child.once('error', (error) => {
      remove();
      reject(error);
    });
    child.once('exit', (code, signal) => {
      remove();
      if (code === 0) resolveRun();
      else reject(new Error(`Judge setup stopped (${signal ?? `exit ${code}`}).`));
    });
  });
}
async function main() {
  requireNode24();
  const args = judgeArguments(process.argv.slice(2));
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const environment = judgeEnvironment();
  if (
    !existsSync(join(root, 'node_modules/tsx/dist/cli.mjs')) ||
    !existsSync(join(root, 'node_modules/vite/package.json'))
  ) {
    console.log('Installing the existing locked project dependencies for local judge access.');
    await run('npm', ['ci', '--no-audit', '--no-fund'], root, {
      ...environment,
      ONNXRUNTIME_NODE_INSTALL_CUDA: 'skip',
    });
  }
  if (productionBuildNeeded(root)) {
    console.log('Compiling the existing Waylatch application for judge access.');
    await run('npm', ['run', 'build'], root, environment);
  }
  stampProductionBuild(root);
  await run(
    process.execPath,
    ['--import', 'tsx', 'scripts/judge-demo.ts', ...args],
    root,
    environment,
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Judge setup failed.');
    process.exitCode = 1;
  });
}
