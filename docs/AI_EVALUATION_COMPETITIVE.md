# Competitive AI evaluation — genuine frozen held-out results

The owner-uploaded original MiniLM bundle independently matches all seven files in `src/risk/model-assets.ts`. No model redownload, substitution, asset-pin change or label change occurred. [Bundle verification](evidence/ai-bundle-verification.json). Real local q8 CPU inference completed on the Node server; descriptions were not sent to an inference service.

Three fresh model-blind AI reviewer sessions previously judged 240 fictional scenarios: 120 duplicate, 108 distinct, 12 ambiguous. Each received only shuffled ID/scenario/left/right packets; split/category metadata, author targets, scoring and predictions were withheld. Each case has one nonexpert AI reviewer, not expert-human adjudication or field ground truth. Scenario facts available to annotators can exceed the information in predictor records. Dataset and annotation files, reviewer packets and original construction disagreements remain unchanged.

## Calibration, then freeze

80 cases, four supply families, 40 duplicate / 36 distinct / four ambiguous; 76 binary cases per method. Final calibration:

| Method        |  TP |  FP |  FN |  TN | Precision | Recall |     F1 |
| ------------- | --: | --: | --: | --: | --------: | -----: | -----: |
| Deterministic |  16 |   8 |  24 |  28 |    0.6667 | 0.4000 | 0.5000 |
| Semantic only |  30 |  34 |  10 |   2 |    0.4688 | 0.7500 | 0.5769 |
| Combined      |  32 |  34 |   8 |   2 |    0.4848 | 0.8000 | 0.6038 |

[Full calibration](evidence/ai-evaluation-calibration.json), including all category/family metrics, predictions, rationales and failures. [Before-held-out decision](AI_CALIBRATION_DECISION.md) retains existing scoring and both 0.60 thresholds despite the large false-positive burden. No tuning was performed. The supported Transformers.js upgrade from 3.8.1 to 4.3.1 resolved all six dependency findings with the exact pinned model. All 80 calibration decisions stayed identical; maximum cosine drift was 0.0134842. Baseline results are preserved separately. Runtime metadata now measures the installed version instead of hardcoding 3.8.1.

The [frozen manifest](../evaluation/frozen-manifest.json) was created after final scoring/loader/evaluator/dependency edits and formatting, before held-out inference. It fingerprints the dataset, independent labels, implementation, settings, model assets and lockfile plus successful calibration. Freeze SHA-256: `db15eb539d75189d245f76b775cbe2dad269c2a2d775b5476cd2e9f479314f41`.

## Once-only held-out result

160 cases, eight supply families disjoint from calibration: 80 duplicate / 72 distinct / eight ambiguous. Each method evaluates the same 152 binary cases; excluded ambiguous predictions remain in the report.

| Method        |  TP |  FP |  FN |  TN | Precision | Recall |     F1 |
| ------------- | --: | --: | --: | --: | --------: | -----: | -----: |
| Deterministic |  32 |  16 |  48 |  56 |    0.6667 | 0.4000 | 0.5000 |
| Semantic only |  62 |  70 |  18 |   2 |    0.4697 | 0.7750 | 0.5849 |
| Combined      |  57 |  70 |  23 |   2 |    0.4488 | 0.7125 | 0.5507 |

[Full held-out report](evidence/ai-evaluation-heldout.json), SHA-256 `fe2d5ebcc00a890b3863de37e30e8d289d8e051ed4837b697e776a785b3b68d7`. The [exclusive completion receipt](../evaluation/frozen-manifest.json.completed.json) and report/manifest hashes were independently verified. The held-out evaluation ran once. It must not be rerun through a new output path/manifest, and the receipt must not be removed. No scoring, thresholds or labels were changed after results.

Combined improves measured F1 by **0.0507** and recall by **0.3125** versus deterministic rules, but precision falls from **0.6667 to 0.4488** and false positives rise from **16 to 70**. Semantic-only has higher held-out F1 than combined (**0.5849 vs 0.5507**). This is a mixed result, not an unqualified AI improvement: semantic similarity adds recall with substantial false-review burden; the combined context gates lose some valid paraphrases. Do not choose a new winner or retune from these results.

## Paired grouped uncertainty

The existing seeded paired supply-family bootstrap used 10,000 draws; all were defined. Held-out delta F1 and exploratory percentile intervals:

| Comparison minus baseline         | Delta F1 | 95% grouped interval |
| --------------------------------- | -------: | -------------------- |
| Combined minus Deterministic      |  +0.0507 | [+0.0196, +0.0810]   |
| Combined minus Semantic only      |  -0.0342 | [-0.0538, -0.0070]   |
| Semantic only minus Deterministic |  +0.0849 | [+0.0320, +0.1267]   |

Only eight held-out clusters (four calibration clusters), shared synthetic templates and nonexpert correlated AI labels make these intervals exploratory. Case-level Wilson intervals for precision/recall are in the reports and ignore within-family dependence. No significance, population accuracy, deployment suitability or real-world prevalence estimate follows from these intervals.

## Family and category breakdowns

Family F1 values; all confusion counts and precision/recall intervals are in the corresponding JSON strata.

| Split / supply family            | Deterministic F1 | Semantic F1 | Combined F1 |
| -------------------------------- | ---------------: | ----------: | ----------: |
| calibration / batteries-lighting |           0.5000 |      0.6667 |      0.6667 |
| calibration / generator-fuel     |           0.5000 |      0.5926 |      0.5926 |
| calibration / medical-dressings  |           0.5000 |      0.5926 |      0.5926 |
| calibration / potable-water      |           0.5000 |      0.4348 |      0.5600 |
| heldout / bulk-meals             |           0.5000 |      0.6429 |      0.5926 |
| heldout / flood-pumps            |           0.5000 |      0.5926 |      0.5385 |
| heldout / infant-feeding         |           0.5000 |      0.4348 |      0.5000 |
| heldout / passenger-transport    |           0.5000 |      0.6429 |      0.5926 |
| heldout / power-distribution     |           0.5000 |      0.5385 |      0.4800 |
| heldout / radio-communications   |           0.5000 |      0.5926 |      0.5385 |
| heldout / sanitation-hygiene     |           0.5000 |      0.5385 |      0.5385 |
| heldout / shelter-structures     |           0.5000 |      0.6667 |      0.6154 |

Complete held-out category confusion counts below use **TP / FP / FN / TN**. Each nonambiguous single-category block has eight cases; exact-description has sixteen; the eight ambiguous cases are excluded.

| Category                           | Deterministic | Semantic | Combined |
| ---------------------------------- | ------------- | -------- | -------- |
| abbreviated-description            | 8/0/0/0       | 7/0/1/0  | 8/0/0/0  |
| conflicting-amounts                | 0/0/8/0       | 7/0/1/0  | 7/0/1/0  |
| consolidated-document              | 0/8/0/0       | 0/8/0/0  | 0/8/0/0  |
| equal-price                        | 0/0/0/8       | 0/6/0/2  | 0/6/0/2  |
| equivalent-terminology             | 0/0/8/0       | 3/0/5/0  | 3/0/5/0  |
| exact-description                  | 8/8/0/0       | 8/8/0/0  | 8/8/0/0  |
| incident-allocation-change         | 8/0/0/0       | 7/0/1/0  | 8/0/0/0  |
| incomplete-structured-fields       | 0/0/8/0       | 7/0/1/0  | 0/0/8/0  |
| insufficient-procurement-facts     | 0/0/0/0       | 0/0/0/0  | 0/0/0/0  |
| missing-attachments                | 0/0/0/8       | 0/8/0/0  | 0/8/0/0  |
| natural-paraphrase                 | 0/0/8/0       | 1/0/7/0  | 1/0/7/0  |
| neighboring-product-specifications | 0/0/0/8       | 0/8/0/0  | 0/8/0/0  |
| overlapping-purpose-terms          | 0/0/0/8       | 0/8/0/0  | 0/8/0/0  |
| receipt-and-order-conflicts        | 0/0/0/8       | 0/8/0/0  | 0/8/0/0  |
| receipt-file-variation             | 0/0/8/0       | 6/0/2/0  | 6/0/2/0  |
| recording-time-gap                 | 8/0/0/0       | 8/0/0/0  | 8/0/0/0  |
| repeated-service-or-replenishment  | 0/0/0/8       | 0/8/0/0  | 0/8/0/0  |
| shared-incident                    | 0/0/0/8       | 0/8/0/0  | 0/8/0/0  |
| typing-errors                      | 0/0/8/0       | 8/0/0/0  | 8/0/0/0  |

## Failures and interpretation

All errors, descriptions and reviewer rationales are retained, not just selected examples. Combined has 70 false positives and 23 false negatives; deterministic has 16/48; semantic-only 70/18. Pair-05-10 falsely flags separately paid weekly soap replenishments despite identical text/cosine 1. Pair-05-11 falsely flags independently fulfilled east/west toilet hires (cosine 0.914). Separate products, repeated services, consolidated receipt lines and order conflicts account for many false positives. A shared receipt/reference is evidence to inspect, not proof of the same expense.

Pair-05-02 misses one tank pump-out paraphrase (0.524); pair-06-03 misses equivalent teats/nipples terminology (0.536). Pair-05-08 has high similarity (0.820) but missing shared structured context defeats the combined gate. Annotation scenarios include supplier facts absent from the records-only predictor. These failures must remain visible; they do not authorize changing labels or thresholds using this held-out set.

## Measured local resources

Linux x64, Node v24.19.0, Intel Xeon Platinum 8573C, Transformers.js 4.3.1 / ONNX Runtime 1.30.0, two CPU inference threads. Fresh CLI processes; shared vectors are reused for semantic and combined scoring. This is not three independent pipeline benchmarks.

| Measurement                  |           Calibration |              Held-out |
| ---------------------------- | --------------------: | --------------------: |
| Model load                   |            648.839 ms |            555.331 ms |
| Cold startup + first batch   |            829.769 ms |            746.593 ms |
| Shared embedding wall time   |            954.908 ms |          1,079.718 ms |
| Actual inference             |            305.109 ms |            522.634 ms |
| End-to-end measured interval |          1,255.713 ms |          1,365.988 ms |
| Process peak RSS             | 424,435,712.000 bytes | 405,594,112.000 bytes |

Calibration embedded 160 texts in two calls; held-out embedded 320 in four calls. Model inference internally batches eight texts. Per-method scoring times, baseline/final RSS, statistics overhead and exact timing scope are in each report. Loading includes local asset verification/import; end-to-end excludes dataset validation, output serialization and disposal. Some calibration verification shared the host with build/tests; measurements are observations, not isolated comparative speed claims, peak workload capacity or phone/browser inference performance. Browser AI evidence comes from the local server, not an offline phone model.

## Original benchmark and remaining limits

The original twelve-case fixtures, 0.78 historical failure and 0.60 calibration history remain preserved. A fresh exact-model benchmark still gives TP5/FP0/FN1/TN6 on the same calibration examples. Original historical evidence remains in Git and `ai-benchmark-upload-baseline.json`; current runtime evidence is `ai-benchmark.json`. It is not a second independent held-out result.

Synthetic English procurement scenarios, balanced class counts, few related supply families and single AI annotations cannot establish field reliability, expert-confirmed duplication, multilingual performance or fraud probability. All findings remain human advisory evidence with no financial authority. Follow [the unchanged evaluation protocol](../evaluation/EVALUATION_PROTOCOL.md); future scoring selection requires new independently annotated held-out groups.
