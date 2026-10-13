import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { MODEL_ASSETS } from '../src/risk/model-assets';
import { MODEL_ID, MODEL_REVISION } from '../src/risk/model';

// Python urllib honors the execution environment's HTTP(S)_PROXY settings.
const download =
  'import sys,urllib.request\nwith urllib.request.urlopen(sys.argv[1], timeout=120) as response, open(sys.argv[2], "wb") as output:\n while True:\n  chunk=response.read(1048576)\n  if not chunk: break\n  output.write(chunk)\n';
const root = resolve(process.env.RESCUELEDGER_MODEL_PATH || 'models', MODEL_ID);
for (const asset of MODEL_ASSETS) {
  const target = resolve(root, asset.file);
  await mkdir(dirname(target), { recursive: true });
  let existing = false;
  try {
    const bytes = await readFile(target);
    existing =
      bytes.length === asset.bytes &&
      createHash('sha256').update(bytes).digest('hex') === asset.sha256;
  } catch {
    /* First download. */
  }
  if (!existing) {
    const temporary = `${target}.download`;
    try {
      execFileSync(
        'python3',
        [
          '-c',
          download,
          `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/${asset.file}`,
          temporary,
        ],
        { stdio: 'inherit', timeout: 180000 },
      );
      const bytes = await readFile(temporary);
      if (
        bytes.length !== asset.bytes ||
        createHash('sha256').update(bytes).digest('hex') !== asset.sha256
      )
        throw new Error(`Asset integrity mismatch: ${asset.file}`);
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  console.log(
    `${existing ? 'Verified existing' : 'Downloaded and verified'} ${asset.file} (${asset.bytes} bytes)`,
  );
}
console.log('Pinned Apache-2.0 model ready. App runtime permits local assets only.');
