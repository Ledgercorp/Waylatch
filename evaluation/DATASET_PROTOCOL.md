# Fictional purchase-identity dataset, version 1

This dataset contains 240 fictional English paired requests written by an AI
coding agent before any new evaluation-model predictions. It is synthetic,
model-blind construction, not emergency field data. No human, expert, or
independent evaluator has labeled these cases at this checkpoint.

The construction target is whether two requests claim **the same original
procurement**, rather than whether they merely merit precautionary review.
Separate legitimate orders, separately authorized non-overlapping hire periods,
or separately purchased invoice lines count as distinct purchases. A transfer
between incidents, correction, late upload, or second document representation
does not create a new original procurement. A recommendation to review a
distinct purchase is not evidence of fraud or an adverse financial decision.

## Files and reproduction

- `cases-unlabeled.json` contains case context and model-input records. It has
  no expected binary labels, authored intent, rationale, or predictions.
- `author-scenario-key.json` contains the author's **construction intent** and
  explanation. This is the record of what the fictional situation was designed
  to mean. It is not independent evaluation annotation.
- `../scripts/build-evaluation-cases.py` stores the 240 hand-authored description
  pairs and procurement situations and generates both files deterministically.
  It uses only the Python standard library; it neither loads a model nor reads
  evaluation predictions. Descriptions are not generated from a cross-product
  of supply names and filler strings.

Reproduce from the repository root with:

```sh
python3 scripts/build-evaluation-cases.py
sha256sum evaluation/cases-unlabeled.json evaluation/author-scenario-key.json
```

The JSON root has `schemaVersion`, `datasetId`, and provenance. Dataset cases
contain `id`, `groupId`, `supplyFamily`, `category`, `split`, `scenario`, `left`,
and `right`. Only `left` and `right` are model inputs. Their exact fields match
`ReviewRecord`: `id`, `incident`, `description`, `amountCents`, `receiptDigest`,
`transactionReference`, and `createdAt`. Do not concatenate scenario text,
category, family, split, or group identifiers into embedding inputs. Receipt
digests and transaction references are explicitly fictional fixture values.
`createdAt` records form creation, not the time of the purchase or delivery.

Frozen pre-prediction SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `cases-unlabeled.json` | `c5a43bab001eb529f5ab07f95c8371741841c304be451852f397de9f1ca0873c` |
| `author-scenario-key.json` | `e347384637a44f2f1cccf562e5f7cd12533665be4ec8ac3edf3f8be3af3b4343` |
| `../scripts/build-evaluation-cases.py` | `ce47c3f391fb5a1e61b32da28bbfc22920d34d7418f7009a9483394ffd7532c4` |

## Composition and split freeze

The split is frozen by whole supply family. Each family contributes twenty
different procurement situations. Each case has a unique group identifier;
there are no shared group identifiers or supply families across splits. A
family's paraphrases and related products remain in that family's split.

| Split | Supply families | Families | Cases |
| --- | --- | ---: | ---: |
| Calibration | Potable water; batteries and lighting; medical dressings; generator fuel | 4 | 80 |
| Heldout | Sanitation and hygiene; infant feeding; radio communications; shelter structures; bulk meals; flood pumps; passenger transport; power distribution | 8 | 160 |

Construction intent is ten same-purchase situations, nine distinct-purchase
situations, and one genuinely unresolved situation per family. That produces
120 same, 108 distinct, and 12 unresolved cases overall; the heldout construction
has 80 same, 72 distinct, and 8 unresolved cases (152 potentially adjudicable
binary cases). Those counts describe construction, not independently reviewed
labels. Independent annotation may disagree or abstain; never force it to fit
these counts.

Each family covers the following twenty situations. The neutral category
`exact-description` is shared by both identical-wording situations, so the file
has nineteen category names: `exact-description` occurs 24 times and every
other category occurs 12 times (8 in heldout, 4 in calibration).

1. Identical entry of a documented procurement.
2. Natural paraphrases of a procurement.
3. Equivalent product or regional terminology.
4. Expanded abbreviations.
5. Typos and corrected transcription.
6. Different receipt-file representations.
7. Conflicting amounts, including subtotal, fee, tax, deposit, or discount.
8. Incomplete structured fields with documented procurement identity.
9. Incident allocation changes.
10. Identical wording of independently fulfilled orders.
11. Separate orders in one incident.
12. Equal prices for unrelated procurements.
13. Overlapping words for goods versus an independently purchased service.
14. Near-neighbor products with separately fulfilled requirements.
15. Separately authorized replenishment or non-overlapping extension.
16. Different receipts supported by independent deliveries or orders.
17. Missing uploads with documented separate purchases.
18. One consolidated receipt containing separately purchased, non-overlapping
    order lines or services.
19. Delayed recording of a documented procurement.
20. Insufficient facts to establish procurement identity.

Some patterns deliberately resist receipt or description shortcuts. Two files
can depict one receipt, while one consolidated file can support separate
purchases. A single invoice's gross and net amounts can disagree. Identical
descriptions, shared incidents, and equal prices can describe valid separate
purchases. Each scenario supplies specific fictional factual context so an
independent reviewer can reason about original purchase identity without any
model output or similarity threshold.

The legacy twelve examples in `src/risk/benchmark-fixtures.ts` are preserved
unchanged (SHA-256
`c8539bb29fa91baaf4aeaae6ba9d3572845ec9486bbc2f3e08f3289c60b5db0d`).
The generator checks all 24 legacy description literals for heldout overlap;
none occur in heldout. Legacy examples remain calibration evidence and must
not be described as independently heldout results.

## Instructions for the independent reviewer

Before any new model predictions, give a fresh reviewer only an unlabeled
packet of `{id, scenario, left, right}`. Keep ordering opaque or shuffle it
deterministically; retain IDs for joining. Withhold the author key, generator
source, category, group, family, split, existing scores, thresholds, metrics,
and prediction outputs. Categories and source ordering can reveal construction
structure, so the full dataset file is not itself a blinded review packet.

Ask the reviewer to decide whether the stated fictional facts establish the
same original procurement, distinct original procurements, or insufficient
facts, and to write a brief reason tied to the evidence. They should distinguish
form creation dates from service dates and check whether a consolidated
invoice's lines overlap. They must not use semantic similarity alone, equate a
precautionary review flag with purchase identity, or infer fraud. Ambiguous
scenarios should receive an unresolved/abstain judgment rather than a guessed
binary answer.

Store complete independent annotations separately, with dataset hash, reviewer
identity/method (including that an agent reviewer is nonhuman), annotation time,
per-case decision, and reason. Freeze these annotations before predictions.
Compare disagreements with the construction key only after that freeze and
retain both original judgments and the conflict record. Do not silently replace
the reviewer's labels with construction intent. If conflicts materially change
adjudicability, disclose the resulting denominator and uncertainty. Any required
label clarification must happen without seeing predictions.

Tune only on calibration families. Do not inspect heldout predictions while
adjusting thresholds, prompts, rules, model choices, or scenario wording. Freeze
all choices before a single heldout run; report heldout results with abstention
counts and both overall and family/category counts. Model running and scoring
are handled separately by the evaluation runner protocol.

## Integrity checks and limitations

The builder asserts 240 unique cases, 480 unique record IDs, unique procurement
groups, 80/160 split counts, twenty cases per family, no cross-split family or
group overlap, no repeated full description pairs, valid seven-field records,
nonempty bounded descriptions, integer-or-null amounts, plausible timestamp
syntax, fictional SHA-256 digest syntax, complete construction-key alignment,
and no legacy heldout literal overlap. Rebuilding emits file hashes and category
counts. The builder reads legacy source text only; no inference executes.

This is an intentionally constructed stress set. Repeated evidence patterns and
balanced per-family design are not estimates of real incident prevalence.
Scenario context contains purchase facts unavailable to the model's seven-field
input, so some cases intentionally test information limits. The construction
author and a later agent reviewer are both nonhuman; a separate agent's blinded
judgment is a reproducibility check, not expert or real-world validation. English
only, no field provenance, no human adjudication, no calibrated fraud probability,
and no operational suitability claim are established by this dataset.
