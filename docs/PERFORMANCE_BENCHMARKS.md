# OneKit JS V3 Performance Benchmarks

## Scope

This document records a reproducible baseline for OneKit JS V3 `3.1.19`. It covers reactive runtime operations, forced-GC heap measurements, and distributable bundle sizes. The benchmark is intended for comparisons across future OneKit revisions on the same machine and Node.js version; it is not a cross-framework ranking.

## Test environment

| Item | Value |
|---|---|
| OneKit version | `3.1.19` |
| Commit | `05118f4` |
| Node.js | `v22.13.0` |
| Platform | Linux `x64` |
| CPU | Intel(R) Xeon(R) Processor @ 2.50GHz |
| Logical CPUs | 6 |
| Runtime iterations | 10,000 per sample |
| Runtime samples | 5 |
| Memory workload | 10,000 objects |
| Forced GC | Enabled with `node --expose-gc` |

The runtime benchmark is executed with `npm run benchmark`, which rebuilds the library and runs `scripts/benchmark-v3.mjs`. The memory benchmark is executed with `npm run benchmark:memory` (or directly with `node --expose-gc scripts/benchmark-memory-v3.mjs`). The CI benchmark job runs both workloads and uploads both JSON reports.

## Runtime results

| Workload | Mean | P50 | P95 | Throughput | Mean heap delta |
|---|---:|---:|---:|---:|---:|
| Reactive effect updates | 16.722 ms | 14.073 ms | 24.602 ms | 598,024 ops/s | 351 KiB |
| Batched reactive updates | 7.435 ms | 7.191 ms | 8.123 ms | 1,344,991 ops/s | 45 KiB |
| Snapshot deep clone | 0.091 ms | 0.042 ms | 0.307 ms | 110,247,506 ops/s | 5 KiB |
| Effect-scope teardown | 0.116 ms | 0.038 ms | 0.347 ms | 86,192,036 ops/s | 6 KiB |

The most meaningful renderer-adjacent result is the comparison between individual and batched updates. Batching reduced the measured mean time from **16.722 ms to 7.435 ms**, approximately **55.5% lower**, and increased throughput by approximately **2.25×** under this workload.

## Memory footprint

The memory benchmark measures V8 `heapUsed` before allocation, at peak immediately after the workload, and after a forced garbage collection. The following values are for 10,000 objects and are retained heap deltas, not per-request production budgets.

| Workload | Elapsed | Heap before | Heap peak | Heap after | Retained delta | Approx. delta/object |
|---|---:|---:|---:|---:|---:|---:|
| Reactive objects with effects | 57.268 ms | 4.031 MiB | 19.592 MiB | 16.950 MiB | 13,229 KiB | 1.32 KiB |
| Scoped effects teardown | 83.424 ms | 5.190 MiB | 19.741 MiB | 10.560 MiB | 5,499 KiB | 0.55 KiB |
| Snapshot deep clone | 24.725 ms | 5.212 MiB | 17.479 MiB | 5.222 MiB | 10 KiB | approximately 1 byte |

The reactive-object workload intentionally keeps 10,000 reactive objects and their effect runners reachable until the measurement completes. Its approximately **13.2 MiB retained heap** therefore represents the cost of the retained reactive graph and subscriptions, not a leak diagnosis. The scoped teardown workload shows a lower retained delta after disposing the effect scope, but its state proxies remain reachable in the returned workload collection. A production leak audit would require repeated mount/update/unmount cycles with all application references released and browser DOM memory included.

## Bundle footprint

| Artifact | Raw size | Gzip size |
|---|---:|---:|
| `dist/onekit.esm.min.js` | 107.14 KiB | 33.49 KiB |
| `dist/onekit.min.js` | 106.62 KiB | 33.25 KiB |
| `dist/onekit.esm.js` | 248.63 KiB | 54.36 KiB |
| `dist/onekit.cjs` | 253.02 KiB | 54.96 KiB |

For browser production delivery, the minified ESM build is the recommended baseline. Its measured compressed transfer footprint is approximately **33.5 KiB before Brotli, HTTP headers, and application code**.

## Interpretation and follow-up

The current baseline shows that batched reactive updates are materially more efficient than issuing the same updates individually. The principal memory cost in this workload comes from retaining reactive objects together with their subscriptions; applications should avoid retaining unnecessary reactive graphs and should dispose scopes when feature lifetimes end.

A jsdom regression harness now exercises 100 repeated hydration/dispose cycles and verifies that event listeners, callback refs, `_vnode`, and component metadata do not remain attached after disposal. This is a lifecycle-cleanup guard rather than a browser heap measurement.

These measurements do not include browser DOM node memory, layout/style cost, event-listener memory, V8 code space, RSS, allocator fragmentation, hydration cost, keyed reconciliation cost, or comparisons against React/Vue/Svelte. The next useful benchmark additions are real-browser DOM reconciliation scenarios, hydration of large server-rendered trees, keyed list reorder workloads, and repeated mount/unmount heap snapshots with application references released.

## Reproduction

```bash
npm run benchmark
npm run benchmark:memory
```

Raw machine-generated outputs are stored in `benchmark-results/v3.json` and `benchmark-results/memory-v3.json`.
