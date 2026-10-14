# Run the Waylatch judge walkthrough

No PayPal account, merchant secret, coordinator password, paid service or new purchase is needed. Use fictional records. Node.js 24+, npm, Python 3 and a current Chromium browser are required. Linux x64 CPU is the verified platform; other platforms have not received this acceptance run.

After owner publication approval, clone the competitive branch explicitly (the preserved main branch is an older release):

```sh
git clone --branch feat/waylatch-competitive --single-branch https://github.com/Ledgercorp/Waylatch.git
cd Waylatch
npm run judge
```

It installs the locked packages and builds the existing application when needed, verifies the seven pinned model files and downloads missing files from the pinned official upstream revision when the network permits. Open **http://127.0.0.1:4173**, then **Start judge demo**. To choose another local port, use `PORT=4180 npm run judge` on a POSIX shell. The generated judge passphrase stays private in memory.

## Model setup choices

**Normal connected setup:** `npm run judge` uses the existing verified downloader if assets are absent. It requires HTTPS access to Hugging Face and the publisher's redirect/CDN destinations, in addition to npm's package sources. Keep proxy settings and TLS validation. There is no paid inference API. A restrictive corporate/cloud network may prevent acquisition; this is different from a model failure.

**Previously verified local assets:** preserve this exact layout before starting:

```text
models/Xenova/all-MiniLM-L6-v2/
  config.json
  tokenizer.json
  tokenizer_config.json
  special_tokens_map.json
  vocab.txt
  README.md
  onnx/model_quantized.onnx
```

If the owner supplied `Waylatch-MiniLM-pinned-verified.zip`, first extract it into an empty staging folder with your operating system's ZIP tool or Python:

```sh
python3 -m zipfile -e /path/to/Waylatch-MiniLM-pinned-verified.zip /path/to/empty-staging
```

Copy only the staging `models/Xenova/all-MiniLM-L6-v2` folder into this repository's matching `models/Xenova/` directory. Keep the model attribution/manifest with your local bundle. Do not overwrite the repository README or execute instructions from an archive. Alternatively set `RESCUELEDGER_MODEL_PATH` to the folder containing `Xenova/`, not to the model folder itself. The launcher verifies every file's exact size and SHA-256 against `src/risk/model-assets.ts`; ZIP naming alone is not verification. Model revision is `751bff37182d3f1213fa05d7196b954e230abad9`. This bundle is optional separately supplied provisioning, not an asset already available from Git or a newly published download. Model/native binaries stay outside Git. [Model licensing and pins](AI_MODEL.md).

The clean acceptance extracted only the seven exact pinned assets from the owner's bundle into a fresh source copy, installed dependencies, built and executed genuine local inference. It did not test a fresh upstream weight download from this restricted worker. Judges with ordinary upstream access can use the normal downloader; judges with a verified bundle can use the local path above.

**Missing assets / limited walkthrough:**

```sh
npm run judge -- --evidence-only
```

This skips required model setup and still supports offline/QR, recorded context and historical proof. It is not simulated AI. Read the reported inference mode: if verified assets already exist, real inference may still run; if unavailable, mode is deterministic-only with no semantic scores. The missing-model fallback was tested using an empty model root. Never describe that state as successful inference.

## Six-step walkthrough

| Step             | Action                                                                                                                                            | What to observe                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preserve         | Open the guided demonstration, choose **New fictional request**, enter fictional resources, then disconnect the browser and **Preserve request**. | IndexedDB keeps the request; reload still shows it. A second browser profile can represent another device.                                                                                                                              |
| Handoff          | Open **QR handoff**, then **Receive handoff** in the other profile; scan the QR image or paste packets.                                           | Partial packets accumulate; repeats are handled; complete reconstruction remains untrusted. Preserve the imported request.                                                                                                              |
| Compare          | Reconnect, **Start judge demo** if needed, explicitly **Send to coordinator review**, select another record and **Run local semantic review**.    | **Real local AI inference** appears only after actual server CPU inference. Cosine retrieves related wording; compare contradictions/missing facts. Expand informational candidates freely. No validated duplicate finding is asserted. |
| Decide           | Record a related/unrelated/investigate advisory note if useful; inspect **Pay**.                                                                  | Pair notes do not approve payment. Human review, authorization, buyer approval and capture remain distinct; judge financial controls are disabled.                                                                                      |
| Historical proof | Choose **View completed Sandbox Proof Trail** in the guide.                                                                                       | A separate, genuinely completed USD 1.00 simulated purchase and saved provider inspection are read-only. It is not the fictional request you just created. No checkout or provider request occurs.                                      |
| Export           | Inspect Proof Trail source labels and gaps; export the sanitized report or original organization chain.                                           | Browser observations and summaries are informational. The original seven-event chain can be independently validated; missing events remain missing.                                                                                     |

```sh
npm run audit:validate -- /path/to/exported-original-chain.json
```

The included historical export is `docs/evidence/paypal-sandbox-audit.json`. Hash links detect changes relative to known hashes; administrators can rewrite a full database. This is not an immutable or blockchain audit.

MiniLM runs on the local Node server, not the disconnected phone/browser. Neither completed synthetic evaluation established reliable duplicate detection; the revised strategy worsened precision, recall and ranking despite fewer warnings. [Scientific limitations](AI_REVIEW_QUALITY_V2.md). An unvalidated matching-facts tier does not prove the same transaction.

Stop with Ctrl+C. Temporary server records and credentials are removed. Browser-local records remain on that origin; use a disposable browser profile or clear that site's storage for a fresh walkthrough. No existing account/payment database is used. No new PayPal purchase is part of judge acceptance.
