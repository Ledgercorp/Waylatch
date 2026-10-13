# Release provenance and license audit

Private release review, 2026-10-13. This is an engineering inventory, not legal clearance. No root license has been adopted.

The lockfile contains 382 package entries; 312 are installed on this Linux runtime. Every entry has a declared license. The complete version/license inventory, optional-platform distinction and installed license-file SHA-256 fingerprints are in [dependency-licenses.json](evidence/dependency-licenses.json). Optional packages are checked through the lockfile metadata; their uninstalled license texts have not been independently downloaded.

## Recommendation and boundaries

Recommend the existing MIT proposal for owner-controlled Waylatch source, subject to separate owner approval of application licensing and final copyright attribution. The owner has corrected the provenance: CrisisCodec is Colby Weiss / LeftSock Labs' unfinished project under the same ownership, and selective packet/reconstruction reuse is owner-controlled internal development. An earlier adopted MIT license is not needed to authorize that internal reuse. The prior blanket CrisisCodec rights qualifier is superseded by this correction. MIT does not replace third-party licenses.

Read-only inspection of the two adapted source files at `8ca845cb19a5cdd29897171c61b1ec95b5c1ba7f`, their introducing/modifying patches and reachable Git history found only Colby Weiss author/committer metadata, no coauthor trailers and no independent contributor attribution in those files. Source hashes match the historical reference ledger. This is scoped evidence supporting the owner's confirmation, not proof of copyright title: unsigned metadata cannot exclude unrecorded or copied material. Any remaining inquiry is limited to independently owned material, if any, incorporated into these two primitives outside the observed history. Preserve the exact reference commit, adaptation disclosure and evidence in [CRISISCODEC_REUSE.md](CRISISCODEC_REUSE.md) and [owner-source-provenance.json](evidence/owner-source-provenance.json). The original RescueLedger history remains intact.

This release should distribute source, lockfile and documentation, not node_modules, native binaries, fonts or model weights. Judges install dependencies from their publishers and download the seven pinned/hash-verified model assets. Preserve notices and upstream source links. If a container, packaged executable or node_modules archive is later distributed, its native-library/source and notice obligations must be reviewed separately before release.

## Material dependency obligations

- Most packages are MIT, ISC, Apache-2.0 or BSD. Retain upstream notices when redistributing their code. Apache patent and NOTICE provisions remain applicable.
- axe-core and @axe-core/playwright are MPL-2.0 development tools. Preserve license/source notices; modifications to covered files have file-level source obligations. No covered upstream source was modified.
- caniuse-lite browser data is CC-BY-4.0. Preserve attribution to caniuse-lite / Can I Use (https://github.com/browserslist/caniuse-lite and https://caniuse.com), license reference and modification indication if redistributing data. No upstream data was modified.
- Transformers.js depends on sharp. Its native libvips bundles include LGPL-3.0-or-later code and additional BSD-like, MIT, MPL, Apache, zlib, IJG and AOM patent-license terms. This is not an all-permissive native bundle. Installed upstream README licensing tables and exact component versions are embedded in the inventory. Upstream build/source: https://github.com/lovell/sharp-libvips; libvips: https://github.com/libvips/libvips. Do not put prebuilt libraries in the source release. Binary redistribution may require corresponding source/relinking materials and notices; an MIT root file does not satisfy those obligations.
- The quantized Xenova/all-MiniLM-L6-v2 model and original sentence-transformers model declare Apache-2.0. Revision, asset hashes, model cards and inference limitations are in AI_MODEL.md. Model weights remain separately downloaded and excluded from Git/source archives.
- No stock photography, externally licensed music, private receipts, vendor logos or CrisisCodec UI/font assets are included. Lucide icons retain ISC notices. The schematic and screenshots are original application artifacts with fictional data.
- The silent preview uses the system DejaVu font through FFmpeg; font files, FFmpeg and Chromium binaries are not redistributed. These development tools retain their own licenses.

## Remaining owner decisions

Approve the proposed application MIT text and final copyright attribution; resolve any identified independently owned contributions, including material outside the observed history of the two CrisisCodec primitives; acknowledge AMBER name-investigation limitations before public branding. CrisisCodec's same-owner provenance and authorized internal reuse are already confirmed by the owner. Public visibility and final submission require separate explicit consent. All runtime secrets, databases, model/native binaries and recording caches are excluded from the release.

## Additional bundled-library source checks

The installed libvips versions manifest also lists libarchive3.8.2,libexif0.6.25,libffi3.5.2 and libheif1.20.2. Their corresponding upstream tag COPYING/LICENSE files were fetched with HTTP200 and retained with SHA-256 in evidence/native-component-licenses.json. These add BSD-family/per-file notices, LGPL2.1-or-later, MIT and LGPL3 terms respectively. This reinforces the source-only distribution recommendation; do not package the native bundle under a blanket MIT assertion.
