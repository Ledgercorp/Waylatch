# Competitive AI evaluation: independently annotated, inference blocked

The frozen 240-scenario dataset has independently produced model-blind annotations. This worker cannot obtain the existing pinned MiniLM assets: both huggingface.co and cas-bridge.xethub.hf.co returned proxy CONNECT 403, and current enforced policy excludes them. No model identity, asset hashes, scoring rules or thresholds were changed. No new comparative-performance or generalization claim is supported.

## Independent annotation

Three fresh AI reviewer sessions each received 80 deterministically shuffled cases containing only `id`, `scenario`, `left` and `right`. They were instructed not to read any other repository files, author key, generator, split/category metadata, model thresholds or predictions. Each individually judged the supplied fictional procurement facts, wrote a specific rationale and retained uncertainty. Their separate packets/results are preserved in `evaluation/blinded-review/`; the complete joined labels are [independent-annotations.json](../evaluation/independent-annotations.json).

Actual judgments: **120 duplicate, 108 distinct, 12 ambiguous**. Calibration has **80 cases: 40 duplicate, 36 distinct, 4 ambiguous**. Held-out has **160 cases: 80 duplicate, 72 distinct, 8 ambiguous** across eight supply families disjoint from the four calibration families. These counts are annotations, not predictions. Ambiguous cases remain in evidence and are excluded from binary metrics.

Dataset SHA-256: `c5a43bab001eb529f5ab07f95c8371741841c304be451852f397de9f1ca0873c`. Joined annotations SHA-256: `40644fb7cf486c873508e00b781231de14af63f2f8c87ca21c48ad3c2c009356`.

This is single-reviewer-per-case AI annotation, not human adjudication or real humanitarian data. Reviewer sessions share a model and can share judgment errors. Subjective confidence is not calibrated. Scenario facts given to annotators include information that the records-only prediction methods cannot observe; some failures may reflect that information limit rather than deficient language representation. The synthetic balanced prevalence, shared templates, English-only scope and few family clusters limit generalization. The author key remains separate; annotations were not replaced to fit it.

## Actual execution

`npm run ai:evaluate -- --mode calibration` exited **2** on 2026-10-13, producing [the blocked calibration report](evidence/ai-evaluation-calibration.json) and [command log](evidence/competitive-calibration-attempt.log). It verified dataset/annotation shape and identities, then failed opening the missing pinned `config.json`. **Zero embedding calls completed; zero embedding vectors were produced.** That report fingerprints the exact attempt, including the package lock at that time; later Vitest security maintenance changes the lock fingerprint for the next successful run.

| Comparison              | Precision / recall / F1          | FP / FN     | Inference latency |
| ----------------------- | -------------------------------- | ----------- | ----------------- |
| Deterministic rules     | Unmeasured in this three-way run | Unmeasured  | Not applicable    |
| Semantic alone          | Unavailable                      | Unavailable | Unavailable       |
| Existing combined logic | Unavailable                      | Unavailable | Unavailable       |

The runner deliberately emits null metrics when genuine inference is unavailable rather than labeling deterministic fallback as AI. Freeze and held-out execution have **not** run: a successful real calibration report is a prerequisite. No held-out predictions exist and no threshold was tuned. A failed asset read is not model-startup latency.

The original twelve-pair benchmark, its historical results and the existing 0.60 threshold are unchanged. Historical successful inference appears in the earlier verified video; it does not substitute for this independent evaluation.

## Resume without repeating payments

Restore supported model-host access, then run the existing downloader, which verifies every pinned asset's byte count and SHA-256 before rename. Do not change the model or substitute embeddings.

```bash
npm run model:download
npm run ai:evaluate -- --mode calibration
# Inspect calibration only. Finish any responsibly justified scoring change before freeze.
npm run ai:evaluate -- --mode freeze
npm run ai:evaluate -- --mode heldout
```

Follow [the evaluation protocol](../evaluation/EVALUATION_PROTOCOL.md). A completed held-out receipt must never be deleted to tune/repeat this test. The final report must include actual precision, recall, F1, confusion counts, grouped uncertainty, scoring/inference latency, all failures and ambiguous exclusions. No PayPal operation is involved.
