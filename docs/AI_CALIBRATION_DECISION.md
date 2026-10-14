# Calibration decision before held-out inference

Decision: retain the existing production scoring and both 0.60 thresholds. No label, dataset, model weight, deterministic gate or scoring change. This decision is made from calibration only, before freezing or executing held-out inference.

The uploaded original model bundle independently matches all seven source pins. The baseline Transformers.js 3.8.1 calibration is preserved in `docs/evidence/ai-evaluation-calibration-baseline.json`. The supported 4.3.1 upgrade resolves the six recorded dependency findings, uses ONNX Runtime 1.30.0 and sharp 0.35.5, and passes genuine local inference with identical original 12-case benchmark decisions. The final calibration report records the actual runtime version rather than the previous hardcoded version string. It has the same predictions and metrics as 3.8.1 across all 80 calibration cases; maximum absolute cosine drift is 0.013484159011491914. This bounded compatibility result does not establish equality on all possible inputs.

| Method            |  TP |  FP |  FN |  TN | Precision | Recall |     F1 |
| ----------------- | --: | --: | --: | --: | --------: | -----: | -----: |
| Deterministic     |  16 |   8 |  24 |  28 |    0.6667 | 0.4000 | 0.5000 |
| Semantic only     |  30 |  34 |  10 |   2 |    0.4688 | 0.7500 | 0.5769 |
| Existing combined |  32 |  34 |   8 |   2 |    0.4848 | 0.8000 | 0.6038 |

Each method excludes the same four ambiguous cases. Calibration combined-minus-deterministic F1 is +0.1038; the four-family paired bootstrap interval is [0.0686, 0.1481]. These are exploratory calibration observations with shared synthetic templates and very few clusters, not an independent deployment-accuracy estimate or a significance claim.

Combined improves recall and F1 in calibration, while precision worsens sharply and false positives rise from 8 to 34. Similar wording is frequently present in separately fulfilled orders. Pair-01-10 is an independently delivered repeat with identical descriptions (cosine 1). Pair-01-18 uses separate lines on one consolidated receipt (cosine about 0.974). Raising a simple cosine threshold cannot distinguish every such pair from genuine duplicate wording. Automatically suppressing all different receipts or different amounts would also lose examples of rescans and corrected forms. No calibration-specific identifier or category rules were added.

False negatives include pair-01-02's tanker-fill paraphrase (cosine about 0.489), pair-01-03's equivalent container units (about 0.558), misspellings in pair-03-05/pair-04-05, and missing-context pairs 02/03/04-08: their semantic scores exceed 0.60 but the combined incident/amount gate does not pass. The annotation scenario includes procurement facts not available in the records-only predictor. Missing those facts is a material input limitation, not justification to relabel a case.

Retain transparent, human advisory review and disclose the false-positive burden. Do not claim that matching a receipt or repeated reference proves duplication. No retuning after held-out results, including in response to unfavorable strata, is permitted. Final source/dependency formatting and compatibility checks precede freeze; the freeze hashes the successful final calibration and exact implementation/lock. A future scoring experiment requires new independent held-out groups.
