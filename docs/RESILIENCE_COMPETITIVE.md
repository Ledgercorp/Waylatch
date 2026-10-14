# Competitive resilience and bounded performance

The new checks verify persisted packet handoff, uncertain-payment recovery, transaction rollback and audit modification detection using fictional requests and controlled faults. They make no PayPal API requests, create no real purchases and spend $0. They complement the existing offline, payment, security and separate-process HTTP simulator tests; they do not replace them.

## Reproduce

From the repository root with the existing dependencies installed:

```sh
npx vitest run tests/resilience-competitive.test.ts
npx tsx scripts/measure-resilience.ts docs/evidence/competitive-resilience-final.json
```

The script creates and removes isolated temporary SQLite files. It uses fake IndexedDB in its own Node process and never opens existing Waylatch data. Provider calls are in-process test-double methods; no OAuth, provider HTTP requests or credential variables are read. The fixture's preapproved status and simulated provider approval are test inputs, not human approvals or payment evidence.

[Final-source observations](evidence/competitive-resilience-final.json) retain timestamps, source SHA-256 fingerprints, all raw latency samples, environment metadata and resource observations. The [earlier development run](evidence/competitive-resilience.json) remains preserved as history. Final measurement script SHA-256 is `c914a12c510c4b54eb2b14757a619b4cbb886d841bb4cc49bc0535ff61d1dffd`; offline storage SHA-256 is `faa9244321e5b921795b85c71f8ca0e081b67bf77df7c4887e96b5b779621067`. Other measured source fingerprints are in the final report. Running the script again replaces the specified report; preserve a previous report under another filename if comparing environments. No improvement claim is made from comparing unrelated workers.

## Executed fault scenarios

Five focused tests passed on 2026-10-13. The measurement run completed at `2026-10-13T22:22:06.768Z`.

| Scenario                                       | Actual observed result                                                                                                                                                                   | Boundary                                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Large interrupted QR packet transfer           | 60 packets, 12,351 raw bytes, 256-byte budget; 11 persisted checkpoints; 59 repeated packets ignored. One omitted resource fragment kept reconstruction incomplete until supplied.       | Tests raw packet transport/reconstruction; no camera or image scan claim.                             |
| Malformed delivery during interrupted transfer | CRC corruption rejected without mutating the accepted receiver.                                                                                                                          | CRC detects accidental corruption, not sender identity or cryptographic authenticity.                 |
| Revision conflicts after persistence           | Equal-revision changed request rejected; revision 2 started with no older fields; old-revision replay rejected; final outbox contained revision 2.                                       | Fake IndexedDB connections close/reopen; actual browser reload is verified separately.                |
| Lost create response and restart               | Simulated provider accepted one logical order; client recorded CREATE_UNCERTAIN. Reopen did not contact the provider. Explicit retry used the same create key and recovered the order.   | Entirely simulated in-process provider.                                                               |
| Lost capture response and restart              | Simulated provider accepted one capture; client recorded CAPTURE_UNCERTAIN. Read-only inspection reconciled PAID after reopen. Repeated order/capture calls made no additional purchase. | Two create method calls, one capture method call and two inspections; one logical order and capture.  |
| Final-state recovery                           | Three SQLite close/reopen cycles preserved the payment and valid eight-event chain; startup made zero provider calls.                                                                    | Clean reopen with persisted uncertain states; not an induced OS power loss.                           |
| Reserved-state interruption                    | Deliberately persisted CREATING and CAPTURING states recovered to uncertain states with zero provider calls; second recovery appended no extra events.                                   | Simulated crash boundary, not an actual killed server.                                                |
| Transaction failure                            | Forced exception rolled back request insertion and its audit append together.                                                                                                            | Single SQLite writer, controlled exception before commit.                                             |
| Persisted audit modification                   | Direct SQLite audit-body edit detected after reopen. Deleted prefix and reordered events rejected; unchanged original remained valid.                                                    | Hash verification detects changes relative to recorded hashes; no external immutable anchor is added. |

## Bounded performance observations

Node `v24.19.0`, Linux `6.18.44`, x64, AMD EPYC 9V45 CPU; three logical CPUs visible. **Temporary files were on tmpfs (memory-backed), not physical disk.** These numbers measure this worker's SQLite and JavaScript behavior. They do not establish end-user storage speed, power-loss durability, concurrency capacity or a production service-level guarantee.

Each request insertion and its audit append used a separate atomic transaction. Reads loaded the entire record set and event chain. Reopen timing includes opening the SQLite file and loading all records. Seven freshly created databases were measured for each size. Values below are median / observed p95 in milliseconds; with seven samples, p95 is the largest sample and is not a reliable tail estimate.

| Records and audit events | Write all records + audit | Read all records + events | SHA-256 chain validation | Reopen + read all records | Database file bytes after close |
| ------------------------ | ------------------------: | ------------------------: | -----------------------: | ------------------------: | ------------------------------: |
| 100                      |             2.119 / 4.244 |             0.315 / 1.440 |            0.299 / 3.060 |             0.345 / 0.446 |                         143,360 |
| 500                      |           15.003 / 57.561 |             1.582 / 2.464 |           1.378 / 30.272 |             1.349 / 4.983 |                         557,056 |
| 1,000                    |           30.704 / 85.925 |             3.312 / 7.870 |            2.126 / 2.459 |             2.124 / 2.161 |                       1,069,056 |

Twenty-five maximum-resource-schema examples (20 resources, each 500 characters) were encoded into 256-byte-budget packets and reconstructed in reverse order. Median encode/reconstruct time was **2.092 ms**, observed p95 **4.099 ms**, maximum **26.882 ms**. Every measured reconstruction was compared with its input. This measures codec processing, not complete QR interaction or model inference.

The complete script took **836.397 ms** inside the running process, excluding import/startup overhead. CPU usage during that interval was 579,386 microseconds user and 108,940 microseconds system. Resident memory sampled before and after was 76,423,168 and 122,216,448 bytes; heap used was 15,433,560 and 32,206,936 bytes. Process lifetime maximum RSS was 119,352 KiB. These samples include the stress harness and multiple retained temporary fixture objects; they are not normal-browser memory use or an isolated model-memory benchmark. CPU can exceed wall time because runtime work can use multiple threads.

## Interpretation and limitations

The bounded tests show that the existing codec rejects incomplete, malformed and stale inputs while supporting interruption recovery, and that reserved or uncertain financial state survives a file-backed store reopen without automatically executing money movement. Recovery remains explicit; these tests do not weaken the application's human review, authorization or capture gates.

The audit chain identifies altered event bodies, missing prefixes and ordering changes against existing hashes. A privileged administrator can rewrite a complete chain and an unanchored deleted tail cannot be discovered from a remaining valid prefix. Waylatch does not describe this as a blockchain or administrator-proof database.

The final-source run on one worker cannot establish broad reliability percentages. Timing samples share process/cache state. SQLite is synchronous and measured with one writer. Real browser reload/reconnection, mobile interaction, visual QR scanning, accessibility and local model startup/inference require their separate recorded browser/model checks. No model-startup, AI accuracy or paid hosting claim is supported by this report.
