# Review quality v2: fewer warnings, failed detection targets

The revised strategy reduces attention volume, but **does not establish better duplicate detection or reviewer effectiveness**. On the once-only new held-out test, attention precision, recall, F1 and fixed-budget ranking all worsen. Predefined primary criteria fail. Retain the quieter, explicit advisory interface only as a prototype for human comparison; do not advertise a precision improvement, validated strong tier or field effectiveness.

## Original unfavorable result remains intact

The first frozen evaluation remains unchanged and must never be retuned/retested as independent evidence. Of 160 synthetic held-out pairs, 152 were nonambiguous (80 duplicate, 72 distinct):

| Original method |  TP |  FP |  FN |  TN | Precision | Recall |     F1 |
| --------------- | --: | --: | --: | --: | --------: | -----: | -----: |
| Deterministic   |  32 |  16 |  48 |  56 |    0.6667 | 0.4000 | 0.5000 |
| Semantic only   |  62 |  70 |  18 |   2 |    0.4697 | 0.7750 | 0.5849 |
| Combined        |  57 |  70 |  23 |   2 |    0.4488 | 0.7125 | 0.5507 |

Combined incorrectly flagged 70/72 distinct pairs. [Original scientific report](AI_EVALUATION_COMPETITIVE.md), [original manifest](../evaluation/frozen-manifest.json) and [original receipt](../evaluation/frozen-manifest.json.completed.json) remain historical evidence. [Independent integrity checks](evidence/quality-scientific-integrity.json) verify byte identity against the starting competitive commit.

## Why, and what changed

[Failure/input analysis](REVIEW_FAILURE_ANALYSIS.md) distinguishes similar wording from the same transaction. Legitimate repeats, recurring periods, separate sites/products and consolidated invoice lines share language, amounts, references or documents. Supplier identity, line allocation, authoritative payment history and fulfillment facts often occur only in scenario narratives. Embeddings cannot recover those missing facts.

The new wrapper preserves the original model and baseline scorer. It forwards already persisted optional location, expenseAt and amountKind; storage/QR schemas remain unchanged. Similarity alone retrieves **potentially related** records. **Needs verification** requires matching receipt and reference, or one matching identity clue plus exact amount without recorded contradiction. **Strong duplicate evidence** additionally requires matching receipt, reference, exact amount and expense timestamp with no material recorded contradiction. Identifiers remain self-declared, and a shared receipt/reference can represent several equal-value lines. Strong remains an unvalidated advisory state, never proof.

The interface ranks supplied candidates by tier/support/cosine, groups repeated summaries, starts informational groups collapsed, shows contradictions before matches, discloses missing facts and moves current-revision unrelated dispositions into a collapsed dismissed group. Relevant revisions invalidate both dismissal attribution and stale scores. These changes reduce interruptions structurally; no human study measured time saved. The API still assesses only its first 100 storage-ordered candidates, then ranks that subset. No complete-database retrieval claim.

AI contributes language retrieval, displayed cosine and ranking ties; structured rules determine attention/strong tiers. This experiment does not isolate an incremental AI benefit in revised attention. No tier/disposition rejects, blocks, authorizes or executes payments.

## New evidence, defined before predictions

[Protocol](../evaluation/review-quality-v2/PROTOCOL.md): 240 entirely new fictional pairs, 12 new supply families, 80 calibration in four families and 160 held out in eight disjoint families. Exact old record IDs/descriptions were checked for no reuse. A separate author saw the protocol but no source, old cases or predictions. Six fresh blinded nonexpert AI sessions produced two judgments per case using differently shuffled packets without split/family/category, code, author targets or predictions. Identity uses scenario plus records; the separately labeled evidence tier uses records only. These are AI judgments, not expert-human ground truth. Same underlying AI/author conventions can create correlated bias.

Final identities: 83 duplicate, 116 distinct, 41 ambiguous. One identity disagreement and 22 tier disagreements merge to ambiguity without adjudication toward predictions. All 480 final judgments plus two superseded repair judgments are retained. [Agreement/raw hashes](../evaluation/review-quality-v2/annotation-agreement.json), [labels](../evaluation/review-quality-v2/annotations.json), [packets](../evaluation/review-quality-v2/annotation-packets/).

Strict validation rejected one authored unknown-amount/numeric-value inconsistency before any v2 inference. Its numeric value was removed, preserving unknown certainty, original record and judgments; both reviewers freshly judged corrected records. [Pre-prediction schema repair](../evaluation/review-quality-v2/authoring-schema-repair.json). No prediction-informed data/label adjustment occurred.

Primary success required ALL: at least 50% relative reduction in attention FPR versus v1, at most 10 attention FP per 100 distinct pairs, duplicate recall at least .50. Separate strong precision target .80; undefined precision fails. Fixed ranking budget floor(.20 × nonambiguous pairs). Family bootstrap uses 10,000 paired draws, seed 20261013. No post-result metric selection.

## Calibration and frozen decision

80 pairs: 29 duplicate, 36 distinct, 15 ambiguous; 65 binary. Same real local vectors for both methods.

| Method                             |  TP |  FP |  FN |  TN | Precision | Recall |     F1 | FP / 100 distinct |
| ---------------------------------- | --: | --: | --: | --: | --------: | -----: | -----: | ----------------: |
| Preserved v1 combined              |  27 |  35 |   2 |   1 |    0.4355 | 0.9310 | 0.5934 |             97.22 |
| Revised attention (needs + strong) |   8 |  10 |  21 |  26 |    0.4444 | 0.2759 | 0.3404 |             27.78 |
| Revised strong only                |   0 |   0 |  29 |  36 | undefined | 0.0000 | 0.0000 |              0.00 |

[Calibration decision](AI_QUALITY_CALIBRATION_DECISION.md) retains the initial conservative strategy despite failed targets. A matching-reference/equal-numeric-amount relaxation would recover seven duplicates but add seven false alerts (TP15/FP17/FN14/TN19); it was rejected. No threshold/scoring changes were selected from calibration. All code/formatting was finished before freeze. Calibration-only results do not independently validate the strategy.

## Once-only new held-out result

160 pairs: 54 duplicate, 80 distinct, 26 ambiguous; 134 binary. All excluded predictions remain in the raw report.

| Method                             |  TP |  FP |  FN |  TN | Precision | Recall |     F1 | FP / 100 distinct |
| ---------------------------------- | --: | --: | --: | --: | --------: | -----: | -----: | ----------------: |
| Preserved v1 combined              |  48 |  77 |   6 |   3 |    0.3840 | 0.8889 | 0.5363 |             96.25 |
| Revised attention (needs + strong) |  10 |  30 |  44 |  50 |    0.2500 | 0.1852 | 0.2128 |             37.50 |
| Revised strong only                |   0 |   0 |  54 |  80 | undefined | 0.0000 | 0.0000 |              0.00 |

[Full held-out report](../evaluation/review-quality-v2/heldout-report.json) includes every prediction, label/rationale, category/family breakdown and false positive/negative. Attention FPR falls from .9625 to .3750 (61.04% relative reduction). This passes the relative-reduction criterion, but **37.5 FP per 100 distinct exceeds 10**, and **.1852 recall misses .50**. Primary success fails. Zero strong alerts means undefined strong precision; the .80 target fails, not 100% precision. Missing exact amount/time corroboration prevents promotion; this corpus does not validate strong-tier positive performance.

Attention alerts including ambiguous identities fall from 142 to 40 across all 160 pairs (125 to40 on binary pairs). Revised returned relationships remain142 (102 informational plus40 needs-verification);18 have no related evidence. Thus fewer interruptions do not mean fewer supplied pairs or better identity accuracy. There is no demonstrated reduction in human minutes.

At the fixed 26-pair budget, v1 retrieves6/54 duplicates (recall .1111, precision .2308,20 distinct inspected); revised retrieves4/54 (recall .0741, precision .1538,22 distinct inspected). Ranking is worse in this bounded global-pair surrogate. No query-level MAP/NDCG or database-retrieval claim.

Records-only tier accuracy is59/146 (.4041);14 ambiguous tiers excluded. Confusion rows are annotated, columns predicted:

| Annotated tier      | None | Potentially related | Needs verification | Strong |
| ------------------- | ---: | ------------------: | -----------------: | -----: |
| None                |    0 |                   0 |                  0 |      0 |
| Potentially related |   12 |                  33 |                  0 |      0 |
| Needs verification  |    4 |                  41 |                 26 |      0 |
| Strong              |    0 |                  16 |                 14 |      0 |

No held-out consensus-none labels were available, so that target class is not evaluated. Thirty consensus-strong pairs receive no strong prediction. This is substantial disagreement, not successful advisory-tier validation.

Examples: v2-05-11 separate base wash/stain-treatment charges and v2-11-02 separately billable interpreter sessions still produce false attention from shared documents/references. v2-06-04 cancelled/rebooked haulage and v2-06-15 reclassified disposal paperwork miss attention because their references/receipts differ; one even misses informational retrieval. v2-10-04 a single drill request followed by its purchase lacks corroboration. These failures remain; no held-out-inspired retuning follows.

| Held-out family         | V1 TP/FP/FN/TN | Revised attention TP/FP/FN/TN |
| ----------------------- | -------------- | ----------------------------- |
| cold-storage-rental     | 5/10/2/0       | 2/4/5/6                       |
| debris-hauling          | 5/10/2/0       | 1/3/6/7                       |
| grain-milling           | 7/9/0/1        | 1/4/6/6                       |
| hand-tools              | 7/9/0/0        | 2/3/5/6                       |
| interpretation-services | 5/10/1/1       | 1/4/5/7                       |
| kitchen-utensils        | 6/10/0/0       | 1/4/5/6                       |
| laundry-services        | 6/9/1/1        | 1/4/6/6                       |
| seedling-restoration    | 7/10/0/0       | 1/4/6/6                       |

## Uncertainty, runtime and immutable run records

Paired family bootstrap attention F1 difference (revised minus v1): −.3235, exploratory95% interval [−.3846,−.2557]. Descriptive FPR difference −.5875 [−.6329,−.5432], recall difference −.7037 [−.7963,−.6000], budgeted recall difference −.0370 [−.1250,.0556]. Eight family clusters and common synthetic author conventions limit inference. Case-level Wilson intervals in raw reports ignore clustering. These are not field-population confidence claims.

Exact unchanged MiniLM revision751bff37182d3f1213fa05d7196b954e230abad9, q8 local CPU, Transformers.js4.3.1, ONNX1.30.0, two CPU threads. All seven assets size/hash verify; no download or paid inference. Held-out cold load533.73ms; first batch plus load677.50ms; shared embedding wall898.77ms and model inference 363.13ms over273 unique texts/three batches (320 occurrences). Total1,807.95ms includes exploratory statistics but excludes validation/fingerprinting/write/disposal. Cached scoring v1 total9.51ms and revised4.57ms across160 pairs; timings are one host observation, not a robust speed comparison. Peak process RSS410,456,064 bytes (391.4MiB), baseline48,074,752 bytes. Not mobile/browser inference, field latency or physical-disk performance. Calibration/runtime detail remains in raw reports; the original12-case threshold-selected benchmark is separately preserved.

Frozen manifest SHA-256 `4533afa55a73ac247fa0466fa742ed516aaf9254381f646ad9f558e20bab3ce4`; held-out report SHA-256 `2cea95f45d05a81e6d68bb176faf0eb6d27e52e8e17dc4d5cd923a0371262e91`. [New exclusive receipt](../evaluation/review-quality-v2/frozen-manifest.json.completed.json) matches actual output; freeze precedes inference, current scoring fingerprints match and original v1 files are unchanged. The held-out evaluation ran once; never remove/replace its receipt or generate another manifest to repeat an unfavorable result.

## Release interpretation

Engineering acceptance supports the functioning advisory comparison prototype. Scientific success criteria are unmet, and revised identity detection and fixed-budget ranking are worse. Fewer warning panels may be a useful presentation choice, but usefulness, trust calibration and time savings require human/field evaluation. Missing supplier/line/payment facts cannot be solved by a higher cosine score. A future strategy needs new hypotheses, sufficiently reliable recorded identity facts and another independently constructed test; neither exposed test can become fresh validation again.

Recommend owner review only with these limitations prominent. Do not claim improved precision, reliable strong alerts, real-world duplicate detection, expert-confirmed accuracy, fraud probabilities or autonomous authority. No payment/provider operations, public publication, legal acceptance or real spending occurred in this phase.
