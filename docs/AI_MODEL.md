# Current real-model verification — 14 October 2026

All seven original pinned assets were supplied in an owner upload and independently size/SHA-256 verified; no model redownload occurred. Runtime is now Transformers.js 4.3.1 with ONNX Runtime 1.30.0. [Current calibration and frozen once-only held-out results](AI_EVALUATION_COMPETITIVE.md), [bundle verification](evidence/ai-bundle-verification.json), [runtime compatibility](evidence/inference-stack-compatibility.json). The substantive false-positive limitations are part of the result. Historical twelve-case timings below describe the earlier release; [original report](evidence/ai-benchmark-historical-prebundle.json) is preserved separately from the refreshed real benchmark.

---

# Local semantic review

Waylatch runs genuine local sentence-embedding inference on the Node server using Transformers.js 4.3.1 and the CPU ONNX runtime. No inference service, API credential, paid endpoint, or external transmission of request descriptions is involved. AI produces review evidence and cannot authorize, reject, or execute payments.

## Model and provenance

- Model: [`Xenova/all-MiniLM-L6-v2`](https://huggingface.co/Xenova/all-MiniLM-L6-v2).
- Pinned revision: `751bff37182d3f1213fa05d7196b954e230abad9`.
- Upstream base model: `sentence-transformers/all-MiniLM-L6-v2`.
- License: Apache-2.0, declared in the pinned model card. [Pinned model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2/blob/751bff37182d3f1213fa05d7196b954e230abad9/README.md); [Apache license](https://www.apache.org/licenses/LICENSE-2.0).
- Weights: `onnx/model_quantized.onnx`, q8, 22,972,370 bytes. All downloaded assets total about 23.9 MB. SHA-256 digests, exact sizes, and pinned revision are recorded in [the asset manifest](evidence/ai-assets.json).
- Output: 384-dimensional embeddings with mean pooling and normalization; cosine similarity is a semantic measurement, not a probability of fraud.

`src/risk/model-assets.ts` pins every asset digest. Runtime checks their sizes and hashes before loading. Models are excluded from Git; setup downloads them from the pinned upstream revision. Retain upstream model attribution/license when redistributing weights. This does not choose the application's root source license.

## Reproduce

Use Node 24+ and Python 3. Downloads use Python's standard-library `urllib`, which honors the environment's HTTP(S) proxy. Install native ONNX dependencies in CPU-only mode to avoid an unnecessary GPU runtime download:

```sh
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
npx tsx scripts/download-model.ts
npm test -- tests/risk.test.ts
npm run test:ai
```

Assets default to `models/Xenova/all-MiniLM-L6-v2/`. Set `RESCUELEDGER_MODEL_PATH` to the model-root directory if launching from another working directory. The downloader verifies existing files, writes new files through temporary paths, and rejects unexpected content. A clean download to `models/reproduction-check` was executed successfully as an independent reproduction check.

Runtime uses `env.allowRemoteModels = false`, local-only pipeline options, two CPU threads, and small inference batches. The first download requires connectivity. After assets are present, inference can operate without network access on the machine running the server. The browser does not execute embeddings: disconnected field devices preserve requests and hand them to a coordinator; local review is available when the coordinator can reach its local server. This is not a claim of offline AI inference on a phone.

## Evidence and interpretation

`npm run test:ai` executes real q8 inference, fails if inference falls back, and writes [machine-readable evidence](evidence/ai-benchmark.json). The fixtures contain six positive paraphrase pairs and six negative pairs, all synthetic English examples. Positive labels mean a coordinator should review possible duplication; they are not fraud labels.

The initial threshold of 0.78 missed all six positive paraphrases; [that original result is retained](evidence/ai-baseline-078.json). After inspecting this small calibration set, the human-review threshold was changed to 0.60. The resulting run recorded **5 true positives, 0 false positives, 1 false negative, and 6 true negatives**. The missed example involves first-aid kits versus medical supply packs. These measurements use the same examples used to calibrate the threshold and are not a held-out accuracy estimate. No operational suitability or general duplicate-detection accuracy is established.

The release-candidate run loaded the model in about 4126 ms, executed 13 inference calls in about 413 ms total, and peaked at approximately 210 MB process RSS. The measured memory increase was about 141 MB; OS, runtime, model verification, request length, and batch size affect memory and latency. Reserve at least 512 MB for initial local evaluation; maximum-length workloads and concurrent server activity have not been stress-tested. This benchmark validates Linux x64 CPU execution, not browser, WebGPU, mobile, multilingual, or emergency field performance.

## Review logic and limitations

`assessPairs(input, candidates)` accepts bounded descriptions and at most 100 candidates. It excludes the same record ID. Recommendations arise from an exact known receipt digest, a repeated known transaction reference, or a semantically similar/identical description with a known shared incident or identical amount. Unknown fields never match each other. Equal amounts, shared incidents, temporal proximity, and different receipts appear as evidence without independently proving duplication. Records created within 72 hours receive a temporal indicator. Conflicting or missing information requires human judgment.

If asset integrity, loading, or inference fails, the result explicitly states `mode: deterministic-only`, `model: null`, and `similarity: null`. Exact receipt/reference/description indicators remain available. This fallback must never be described as successful AI inference. No fraud probability, automatic adverse decision, or financial instruction is returned.

The unit suite covers missing data, exact evidence, amount-only false alarms, semantic/context combination, workload bounds, malformed vectors, and corrupted real asset loading. Injected vectors in scoring tests exercise the review contract; only the separately executed benchmark supplies evidence of actual inference.
