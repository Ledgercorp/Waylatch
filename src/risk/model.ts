import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MODEL_ASSETS } from './model-assets';

export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const MODEL_REVISION = '751bff37182d3f1213fa05d7196b954e230abad9';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';
type Extractor = FeatureExtractionPipeline;
let extractor: Promise<Extractor> | undefined;
let queued: Promise<unknown> = Promise.resolve();
export const modelMetrics = { loadMilliseconds: 0, inferenceMilliseconds: 0, inferenceBatches: 0 };
export const modelRuntime = { transformersVersion: null as string | null };

async function loadModel(): Promise<Extractor> {
  const started = performance.now();
  const modelPath = resolve(process.env.RESCUELEDGER_MODEL_PATH || 'models');
  for (const asset of MODEL_ASSETS) {
    const bytes = await readFile(resolve(modelPath, MODEL_ID, asset.file));
    if (
      bytes.length !== asset.bytes ||
      createHash('sha256').update(bytes).digest('hex') !== asset.sha256
    )
      throw new Error('Local model asset integrity check failed');
  }
  const { env, pipeline } = await import('@huggingface/transformers');
  modelRuntime.transformersVersion = env.version;
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = `${modelPath}/`;
  env.useFSCache = false;
  const result = await pipeline('feature-extraction', MODEL_ID, {
    revision: MODEL_REVISION,
    dtype: 'q8',
    device: 'cpu',
    local_files_only: true,
    session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
  });
  modelMetrics.loadMilliseconds = performance.now() - started;
  return result;
}

/** Node CPU inference only. Never fetches model assets or sends descriptions over the network. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  if (texts.length > 101 || texts.some((text) => !text.trim() || text.length > 2000))
    throw new Error('Embedding workload exceeds limits');
  const work = queued.then(async () => {
    extractor ??= loadModel().catch((error) => {
      extractor = undefined;
      throw error;
    });
    const pipe = await extractor;
    const started = performance.now();
    const vectors: number[][] = [];
    // Small batches keep peak memory bounded even with the maximum candidate count.
    for (let offset = 0; offset < texts.length; offset += 8) {
      const output = await pipe(texts.slice(offset, offset + 8), {
        pooling: 'mean',
        normalize: true,
      });
      vectors.push(...(output.tolist() as number[][]));
    }
    modelMetrics.inferenceMilliseconds += performance.now() - started;
    modelMetrics.inferenceBatches++;
    return vectors;
  });
  queued = work.catch(() => undefined);
  return work;
}

export async function disposeModel(): Promise<void> {
  await queued;
  if (extractor) {
    await (await extractor).dispose();
    extractor = undefined;
  }
}
