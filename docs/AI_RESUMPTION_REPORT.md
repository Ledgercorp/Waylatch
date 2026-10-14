# Genuine AI evaluation and judge acceptance completed

Continued from private `feat/waylatch-competitive` SHA `3ef69d1d8ccba030d4335c0551f3be0f3a0a743c`. Main and the preserved release candidate remain `3580d35a7176afd93abf52fbde391061a4ff30d6`. Final commit/remote readback is reported in the completion response. **Recommendation: ready with documented limitations for owner release review; no publication or submission approval has been exercised.** The prior model-dependent engineering blocker is resolved for these local assets.

## Uploaded assets and runtime

Owner supplied `Waylatch-MiniLM-pinned-verified.zip`, 16,539,576 bytes, SHA-256 `ccca26d13bb912bc8c532513093f643a36e83cf484ab87b4940a16150fb47f11`. All seven members under `models/Xenova/all-MiniLM-L6-v2/` match the existing source sizes and SHA-256 digests. Only these seven files were extracted; bundle metadata was treated as data, not instructions. [Exact verification](evidence/ai-bundle-verification.json). No model redownload, weight substitution, pin change or network-policy bypass occurred. Model binaries and the upload remain outside Git.

Model is unchanged Xenova/all-MiniLM-L6-v2 revision `751bff37182d3f1213fa05d7196b954e230abad9`, q8, 384 dimensions, local CPU, two inference threads. Runtime is the same task environment `ccarenv_b64_Y2NhcmVudl84OGEwZWYwODIzNzQ4MTkxYjg2NjA5YjNiY2E3ZDhhNQ`. Earlier CDN denial evidence remains historical and no new model HTTP request was made. Full judge acceptance used verified local assets, including a clean source bootstrap with `RESCUELEDGER_MODEL_PATH` pointing to that local root. This does not claim that this cloud executor's separate official model-download restriction changed.

## Calibration → freeze → one held-out run

[Detailed scientific report](AI_EVALUATION_COMPETITIVE.md), [pre-freeze calibration decision](AI_CALIBRATION_DECISION.md), [calibration JSON](evidence/ai-evaluation-calibration.json), [frozen manifest](../evaluation/frozen-manifest.json), [held-out JSON](evidence/ai-evaluation-heldout.json), [completion receipt](../evaluation/frozen-manifest.json.completed.json).

| Split / method              |  TP |  FP |  FN |  TN | Precision | Recall |     F1 |
| --------------------------- | --: | --: | --: | --: | --------: | -----: | -----: |
| Calibration / deterministic |  16 |   8 |  24 |  28 |    0.6667 | 0.4000 | 0.5000 |
| Calibration / semantic      |  30 |  34 |  10 |   2 |    0.4688 | 0.7500 | 0.5769 |
| Calibration / combined      |  32 |  34 |   8 |   2 |    0.4848 | 0.8000 | 0.6038 |
| Held-out / deterministic    |  32 |  16 |  48 |  56 |    0.6667 | 0.4000 | 0.5000 |
| Held-out / semantic         |  62 |  70 |  18 |   2 |    0.4697 | 0.7750 | 0.5849 |
| Held-out / combined         |  57 |  70 |  23 |   2 |    0.4488 | 0.7125 | 0.5507 |

Four calibration and eight held-out ambiguous cases are excluded from binary metrics but retained with predictions. Dataset, annotations and scoring rules remain unchanged. Thresholds stay 0.60. The supported dependency upgrade and actual-version reporting were finalized/formatted before freeze. The exclusive held-out receipt/report hashes verify; no retuning, relabeling, repeated held-out inference or alternate manifest occurred.

Combined versus deterministic held-out F1 delta is +0.0507; the paired eight-family bootstrap interval is [+0.0196, +0.0810]. Combined versus semantic is -0.0342, interval [-0.0538, -0.0070]. The result is mixed: recall/F1 improve over deterministic matching while false positives increase from 16 to 70 and semantic-only outperforms combined F1. This false-review burden is a substantial limitation, not a hidden success criterion. Details include category/family breakdowns and every failure/rationale.

Held-out model loading: 555.331 ms; cold start plus first batch: 746.593 ms; shared inference: 522.634 ms for 320 texts; shared embedding wall time: 1,079.718 ms; measured end-to-end: 1,365.988 ms; process peak RSS: 405,594,112 bytes. These figures share embeddings between semantic methods and describe one Linux x64 CPU process, not separate pipeline benchmarks or mobile/browser inference.

The original twelve-case benchmark remains preserved; genuine inference still yields TP5/FP0/FN1/TN6 on those calibration fixtures. Synthetic English scenarios, nonexpert model-blind AI annotations, shared templates, balanced prevalence, few clusters and missing predictor facts preclude field reliability, expert-confirmed duplication or fraud-probability claims.

## Six dependency findings resolved with real-model verification

Transformers.js is pinned to **4.3.1**, using ONNX Runtime **1.30.0**, sharp **0.35.5** and global-agent **4.1.3**. Vulnerable roarr/sprintf-js paths are removed. The new native bundle has libvips **8.18.7**, libheif **1.23.5** and librsvg **2.63.2**, exceeding the recorded advisory floors. Fresh audit: **zero findings**, versus the prior two high/four moderate package findings.

[Individual package/advisory resolution](DEPENDENCY_REVIEW_FINALIZATION.md), [compatibility evidence](evidence/inference-stack-compatibility.json), [audit](evidence/semantic-dependency-audit.json), [native notices](evidence/semantic-native-components.json). All 80 calibration decisions are identical to the old runtime; maximum cosine drift is 0.0134842. The original benchmark, real app inference, clean install and complete tests pass. Memory/startup differ; no performance improvement or universal output equivalence is claimed. Zero known advisories is not security certification. Upstream notices and model license remain; root application MIT was not adopted.

## Integrated application, judge and Proof Trail

- **139 unit/integration tests in 30 files passed** on the upgraded stack. Existing legacy RescueLedger/QR, stale evidence, fault/restart, approval/payment, audit tamper and isolation coverage remains.
- TypeScript and production build pass. The existing >500 kB chunk/upstream annotation warnings remain bounded build observations.
- **All nine original browser tests pass**, including genuine AI and separate claim-review approval with no transfer. One obsolete assertion looked inside intentionally collapsed candidate summaries; it now checks the visible advisory warning and actual unchanged approval/payment state. No production UI redesign or scoring change.
- **All five competitive browser tests pass with real AI**, including 390/1440px layouts, difficult calibration hard-negative comparison, revision/stale snapshot protection, advisory disposition independence and historical exports. Seven competitive axe states have zero violations; the original suite's accessibility assertions also pass. This is automated Chromium coverage, not comprehensive manual accessibility certification.
- Default `npm run judge` passes from a separate source tree with neither dependencies nor build output initially present. It installs/builds, uses the already verified local model, needs no merchant secrets/password, starts seven fictional records with zero payments, and separates the historical archive. Genuine near-duplicate cosine is **0.7968**; unrelated radio-battery cosine is **0.2070**. The three tested financial routes return 403; shutdown removes the isolated database. [Clean acceptance](evidence/semantic-clean-judge.json).
- Source labels distinguish real semantic evidence, deterministic context, browser observations, server audit and archived provider inspection. Original seven-event chains independently validate both directly and from the newly recorded browser export. Missing events are not invented; sanitized reports are not original hash preimages; administrators can rewrite a full unanchored chain. No new fictional request inherits the historical purchase.

[Browser evidence](evidence/semantic-competitive-browser.json), [original browser log](evidence/semantic-product-browser.log), [competitive browser log](evidence/semantic-competitive-browser-tests.log), [actual mobile comparison](evidence/semantic-competitive-comparison-mobile.png). Earlier tmpfs performance samples remain preserved and are not physical-disk benchmarks.

## Updated private demonstration

Current [MP4](demo/waylatch-competitive-preview.mp4): **87.68 seconds**, H.264 1600×900, silent with [captions](demo/competitive-captions.srt), 2,375,870 bytes, SHA-256 **`cd673e2d243117181db3bf9e0910ffd70087b55823b90ebaaf9bc4c45b480c1c`**. [Current script/source descriptions](demo/COMPETITIVE_SCRIPT.md), [recording hashes](evidence/competitive-demo-recording.json), [render manifest](evidence/competitive-demo-video.json).

New actual app footage shows offline reload, second-browser QR image decoding/reconstruction, current genuine local MiniLM comparison, advisory/disabled financial boundaries, separately labeled historical Sandbox evidence and Proof Trail exports. The former fallback and older AI excerpt are replaced by current genuine footage. No buyer authorization or capture is reenacted. Original payment source files and the 110.04-second engineering preview remain byte-for-byte unchanged.

The previous **97.52-second** preview is preserved separately as `docs/demo/waylatch-competitive-fallback-preview.mp4`, with its exact **`1a4e0542c1c7a734df8c87c09e3ddc6bf7264b632b27de06c4a853d08fc9cb8d`** hash, captions and historical metadata. No video was uploaded publicly. Recording uses the installed system FFmpeg through Playwright's local executable cache; no model was downloaded for tooling.

## Financial and release boundaries

Historical request RL-REAL-20261013-201748 revision 1, order **2W330508JA572391V**, capture **8WY07860808872629**, exact **USD 1.00 simulated / USD 0.00 real spending**, remains genuine saved evidence. No OAuth, provider GET, order, buyer approval, capture or Payouts operation was repeated. Normal human authorization boundaries are unchanged; judge financial operations are blocked.

Total real spending **$0**. GitHub remains private; only the competitive branch is pushed. No root license adoption, paid hosting, repository visibility change, public video upload, legal terms acceptance or Devpost submission. Same-owner CrisisCodec provenance and third-party notices remain. Actual signed webhook delivery/Payouts, branding/legal eligibility, public source licensing/publication and final submission remain separate limitations or owner decisions. The private candidate is technically ready for owner review **with the disclosed scientific limitations**, not approved for autonomous release or operational fraud detection.
