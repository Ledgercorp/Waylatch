# Local duplicate-review comparison protocol

This evaluation compares possible duplicate-expense recommendations on synthetic scenarios. It does not measure fraud, field performance, or a calibrated probability. The original 12-example smoke benchmark and its evidence remain unchanged; its selected 0.60 threshold is calibration history, not heldout evidence.

## Dataset and independent annotation

The planned dataset contains 240 scenarios: 12 supply families with 20 cases each. Four complete families (80 cases) form calibration; eight different complete families (160 cases) form heldout. Both `groupId` and `supplyFamily` must be disjoint across splits. Case IDs must be unique, every pair must have two different record IDs, and each record must meet the existing review input limits. The runner reports actual composition rather than assuming all authored targets were accepted.

`cases-unlabeled.json` contains `{schemaVersion: 1, datasetId, provenance, splitPolicy, cases}`. Each case contains `{id, groupId, supplyFamily, category, split, scenario, left, right}`. `left` and `right` contain the existing seven `ReviewRecord` fields. The unlabeled cases must not contain `duplicate`, `decision`, or `label` target fields.

An independent reviewer receives only `{id, scenario, left, right}`. Withhold categories, split metadata, author target keys, generator code, model outputs, and model thresholds to reduce annotation bias. The independent reviewer produces `independent-annotations.json`: `{schemaVersion: 1, datasetId, method, annotations: [{caseId, decision, rationale, confidence}]}`. Decisions must be `duplicate`, `distinct`, or `ambiguous`. Every case needs exactly one annotation, and unknown case IDs are rejected. Model-blind AI annotation is independent of the author and evaluated model, but it is not human adjudication. Record its method honestly; reviewer confidence does not become a prediction confidence score.

Ambiguous annotations remain in the evidence with predictions but are excluded from all binary metrics. Preserve disagreements with the construction key; do not silently replace independent labels with intended labels or force uncertainty into a binary target. Do not inspect heldout predictions to alter labels, cases, thresholds, or scoring rules.

## Three fixed methods

1. **Deterministic:** execute the existing `createReviewer` with semantic embedding explicitly unavailable. Exact receipt/reference matches and existing identical-description/context evidence remain active. No semantic vectors enter this baseline.
2. **Semantic only:** use real `embedTexts` CPU output and cosine similarity alone, with the existing 0.60 threshold. No incident, amount, receipt, or reference gate is applied.
3. **Combined:** execute the existing `createReviewer` with the same genuine vectors. Preserve the production scoring rules and the existing 0.60 semantic threshold.

The evaluator does not modify `review.ts` or tune a threshold. Calibration evidence can inform a separately reviewed scoring change before freezing. If a change is made, rerun calibration with the final code, update this protocol deliberately if necessary, and freeze only that final configuration. Existing combined rules are retained unless an independently justified calibration decision changes them. Never select a winner or adjust scoring after seeing heldout results.

## Execution and freezing

No evaluation step calls PayPal, creates payments, or publishes anything. `embedTexts` uses local verified assets and forbids remote model loading. Model downloads are a separate authorized step. Missing, corrupt, or unavailable assets must produce `blocked-local-model-unavailable`, `realInferenceCompleted: false`, null metrics, and an actionable error. Deterministic fallback is never reported as successful AI inference.

Run from the repository root in a fresh process, after all annotations and local assets are ready:

```bash
npx tsx scripts/evaluate-ai.ts --mode calibration
npx tsx scripts/evaluate-ai.ts --mode freeze
npx tsx scripts/evaluate-ai.ts --mode heldout
```

The default files are:

- Dataset: `evaluation/cases-unlabeled.json`
- Independent labels: `evaluation/independent-annotations.json`
- Calibration evidence: `docs/evidence/ai-evaluation-calibration.json`
- Frozen manifest: `evaluation/frozen-manifest.json`
- Heldout evidence: `docs/evidence/ai-evaluation-heldout.json`

Optional path arguments are `--dataset`, `--annotations`, `--output`, `--manifest`, and `--calibration-report`. Calibration is the default mode. Freeze requires successful real calibration evidence with exactly the same fingerprint; it never runs heldout inference. The manifest is written exclusively and cannot be overwritten.

Before heldout embedding, verify SHA-256 fingerprints of the dataset, independent annotations, evaluator, metrics, reviewer, model loader, pinned asset metadata, and package lock. The manifest also pins model ID/revision, quantization, dimensions, CPU threads, thresholds, and bootstrap settings, and hashes the successful calibration report. Changes invalidate the manifest. Finish all source edits and formatting before freezing.

Heldout execution acquires an exclusive manifest lock. It refuses a completed report and writes a manifest-associated completion receipt on success, so an alternate output path cannot repeat the same frozen evaluation. A blocked model attempt may be retried without changing frozen inputs after assets become available. Do not delete a completed receipt or create another manifest to tune against this heldout set. A fresh genuine evaluation requires new independently annotated heldout groups. These filesystem guards prevent routine accidental reruns, not deliberate tampering.

If interrupted, inspect the process and `frozen-manifest.json.running` before deciding whether a stale lock may be removed. A completion receipt can precede report writing; if the report write fails, preserve the receipt and disclose that interruption instead of silently rerunning.

## Metrics and uncertainty

Report TP, FP, FN, TN, evaluated count, and ambiguous exclusions for each method, plus precision `TP/(TP+FP)`, recall `TP/(TP+FN)`, and F1 `2TP/(2TP+FP+FN)`. A zero denominator yields `null`, not a manufactured zero. F1 can be zero when errors exist even if precision itself is undefined.

Precision and recall each receive a 95% Wilson score interval with `z = 1.959963984540054`. These are descriptive binomial case-count intervals and do not account for correlated examples. They must not be presented as independent-case population uncertainty.

For comparisons, use a paired cluster percentile bootstrap with seed `20261013` and 10,000 iterations. Sample the same supply families with replacement for both methods; retain every case in each sampled family, including repeated draws. Recompute pooled F1 and comparison-minus-baseline F1. Report the observed delta, 2.5th/97.5th percentile interval, method F1 intervals, family count, and counts of valid/undefined replicates. Do not replace undefined bootstrap replicates with zero. Report combined versus deterministic, combined versus semantic, and semantic versus deterministic.

Only four calibration and eight heldout families are planned. Intervals from so few clusters are exploratory and may be unstable. Shared synthetic templates can introduce dependence across families, which family resampling does not eliminate. Synthetic class balance does not estimate real-world duplicate prevalence, and model-blind AI labels may retain correlated judgment errors. No significance, deployment suitability, or population accuracy claim follows automatically from an observed F1 gain.

Report family and category breakdowns, all case decisions, similarity, evidence reasons, and false-positive/false-negative case IDs with both descriptions and annotation rationales. Discuss failures and ambiguous cases alongside aggregate metrics. Avoid selecting only favorable strata or treating subgroup intervals as independent confirmations.

## Actual runtime and cost accounting

Embed only the requested split. Embed at most 100 descriptions per call, below the existing 101-text bound; the loader internally uses batches of eight. Each description is embedded once per run, and both semantic methods reuse those genuine vectors. Validate exact vector count, 384 dimensions, finite values, and nonzero norm before scoring. Any unavailable inference blocks all AI comparison metrics.

Record cold model loading, startup plus first batch, shared embedding wall time, actual inference time, embedding calls/texts, and separate per-method scoring latency. The combined score calls the existing reviewer with cached real vectors; its scorer time excludes embedding. These figures describe one shared-inference experiment, not three independent pipeline benchmarks. Record measured run time, timing scope, host/CPU/runtime, memory, and statistics time. Report serialization and disposal are outside the measured inference/scoring interval. Cold-start measurements require a fresh CLI process.

## Verification and interpretation

Focused unit tests cover manually counted confusion tables, undefined metrics, Wilson bounds, paired family resampling, deterministic seeds, dataset split leakage, label identity/completeness, frozen-input changes, completed-run overwrite protection, and genuinely unavailable local model assets. Tests using manual fixtures verify statistics/guards only and are not performance evidence.

A successful calibration report is explicitly calibration-only. A successful frozen heldout report supports a comparison on this particular synthetic grouped dataset under the disclosed annotation method. It does not establish generalization to real expenses, people, languages, disasters, devices, or future data. If actual inference cannot run, deliver the blocked evidence and the exact remaining commands without inventing comparative metrics.
