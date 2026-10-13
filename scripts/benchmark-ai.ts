import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, arch } from 'node:os';
import { BENCHMARK_PAIRS } from '../src/risk/benchmark-fixtures';
import { assessPairs, SEMANTIC_THRESHOLD, type ReviewRecord } from '../src/risk/review';
import {
  disposeModel,
  embedTexts,
  MODEL_ID,
  MODEL_REVISION,
  modelMetrics,
} from '../src/risk/model';
import { MODEL_ASSETS } from '../src/risk/model-assets';

const baselineRss = process.memoryUsage().rss;
const started = performance.now();
const results = [];
const counts = { truePositives: 0, falsePositives: 0, falseNegatives: 0, trueNegatives: 0 };
try {
  const warmup = await embedTexts(['Synthetic flood shelter procurement benchmark']);
  if (warmup[0].length !== 384 || !warmup[0].every(Number.isFinite))
    throw new Error('Invalid real model output');
  for (const pair of BENCHMARK_PAIRS) {
    const base: ReviewRecord = {
      id: `${pair.id}-a`,
      incident: 'DEMO-FLOOD',
      description: pair.left,
      amountCents: 12500,
      receiptDigest: null,
      transactionReference: null,
      createdAt: '2026-10-13T09:00:00.000Z',
    };
    const time = performance.now();
    const assessment = await assessPairs(base, [
      { ...base, id: `${pair.id}-b`, description: pair.right },
    ]);
    if (assessment.mode !== 'semantic-local')
      throw new Error(`Real inference did not execute: ${assessment.limitation}`);
    const candidate = assessment.candidates[0];
    if (pair.duplicate && candidate.reviewRecommended) counts.truePositives++;
    else if (pair.duplicate) counts.falseNegatives++;
    else if (candidate.reviewRecommended) counts.falsePositives++;
    else counts.trueNegatives++;
    results.push({
      ...pair,
      similarity: candidate.similarity,
      reviewRecommended: candidate.reviewRecommended,
      reasons: candidate.reasons,
      milliseconds: performance.now() - time,
    });
  }
  const rss = process.memoryUsage().rss;
  const evidence = {
    executedAt: new Date().toISOString(),
    category: 'executed-real-local-ai-inference',
    model: MODEL_ID,
    revision: MODEL_REVISION,
    license: 'Apache-2.0',
    dtype: 'q8',
    embeddingDimensions: 384,
    threshold: SEMANTIC_THRESHOLD,
    thresholdChosenBeforeBenchmark: false,
    calibration:
      'Initial 0.78 threshold missed all six positive paraphrases. 0.60 was selected after inspecting these synthetic fixtures; these results are calibration-set measurements, not a held-out accuracy estimate. Initial evidence retained in ai-baseline-078.json.',
    runtime: {
      node: process.version,
      platform: platform(),
      architecture: arch(),
      cpu: cpus()[0]?.model,
      transformers: '3.8.1',
      threads: 2,
      remoteModelsAllowed: false,
    },
    metrics: {
      ...counts,
      precision: counts.truePositives / Math.max(1, counts.truePositives + counts.falsePositives),
      recall: counts.truePositives / Math.max(1, counts.truePositives + counts.falseNegatives),
      ...modelMetrics,
      totalMilliseconds: performance.now() - started,
      baselineRssBytes: baselineRss,
      finalRssBytes: rss,
      rssIncreaseBytes: rss - baselineRss,
      processPeakRssBytes: process.resourceUsage().maxRSS * 1024,
    },
    assets: MODEL_ASSETS,
    results,
    limitations: [
      '12 synthetic English examples are a smoke benchmark, not a representative accuracy evaluation.',
      'Semantic similarity and review recommendations are not evidence of fraud.',
      'Memory and timing depend on host and cannot establish mobile/browser compatibility.',
      'Model download requires network once; runtime is Node CPU local inference with pinned assets.',
    ],
  };
  await mkdir('docs/evidence', { recursive: true });
  await writeFile('docs/evidence/ai-benchmark.json', `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(
    JSON.stringify(
      { category: evidence.category, mode: 'semantic-local', metrics: evidence.metrics },
      null,
      2,
    ),
  );
} finally {
  await disposeModel();
}
