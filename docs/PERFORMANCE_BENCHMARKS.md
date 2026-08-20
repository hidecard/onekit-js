# OneKit JS V3 Performance Benchmarks

## Scope

This document records a reproducible baseline for OneKit JS V3 `3.1.19`. It covers reactive runtime operations, forced-GC heap measurements, distributable bundle sizes, and real-browser DOM reconciliation timings. The benchmark is intended for comparisons across future OneKit revisions on the same machine and Node.js version; it is not a cross-framework ranking.

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

## Real-browser DOM performance baseline

The Playwright matrix runs the same renderer workloads in Chromium, Firefox, WebKit, and Microsoft Edge. Each browser creates and hydrates the fixture, then measures five reorder patches over a 500-item keyed list, four reverse-order patches over a 300-card DOM-heavy tree, hydration of a 400-item server-rendered tree, hydration of a 120-group slot-heavy tree containing 360 projected slot nodes, four post-hydration updates of all slot contents, and four keyed reorders of the slot-heavy tree. The versioned budgets are stored in `scripts/browser-performance-budgets.json` and are applied identically to every browser project.

| Browser matrix | Keyed list workload | DOM-heavy workload | Coverage |
|---|---:|---:|---|
| Chromium, Firefox, WebKit, Microsoft Edge | 500 keyed items × 5 reorder rounds; 400 SSR nodes × 1 hydration | 300 article cards × 4 reverse patches; 120 slot groups / 360 projected nodes × 1 hydration; 120 groups × 4 content updates; 120 groups × 4 keyed reorders | 4 browsers / 24 performance tests; plus 1 Chromium heap test (3 matrix skips) |

The local validation run completed **52 browser test entries**: **49 passed and 3 intentionally skipped** because the heap snapshot test is Chromium-only, including 24 performance tests across the four-browser matrix plus one Chromium lifecycle-memory test. The current budgets are **150 ms** for the 500-item keyed-list workload, **200 ms** for the 300-card DOM-heavy workload, **300 ms** for the 400-node SSR hydration workload, **250 ms** for slot-heavy hydration, **300 ms** for the 120-group slot-heavy content-update workload, **350 ms** for the 120-group slot-heavy keyed-reorder workload, and **8 MiB** of retained post-GC heap growth for the lifecycle workload. The SSR and slot-heavy scenarios assert zero hydration mismatches, preserve expected node counts, verify that updated projected content is visible, verify that keyed projected article nodes retain identity through reorders, and attach JSON timing reports per browser. A warning is emitted at **80%** of each budget; exceeding a hard budget fails the Playwright job, produces a GitHub Actions warning annotation when the warning threshold is crossed, and preserves the JSON report in the browser artifact. The measured Chromium update and reorder baselines were approximately **70 ms** and **28 ms**, respectively; these values are informational, while the versioned hard budgets apply uniformly across browsers.

## Interpretation and follow-up

The current baseline shows that batched reactive updates are materially more efficient than issuing the same updates individually. The principal memory cost in this workload comes from retaining reactive objects together with their subscriptions; applications should avoid retaining unnecessary reactive graphs and should dispose scopes when feature lifetimes end.

A jsdom regression harness now exercises 100 repeated hydration/dispose cycles and verifies that event listeners, callback refs, `_vnode`, and component metadata do not remain attached after disposal. This is a lifecycle-cleanup guard rather than a browser heap measurement.

These measurements do not include browser DOM node memory, layout/style cost, event-listener memory, V8 code space, RSS, allocator fragmentation, or comparisons against React/Vue/Svelte. The real-browser suite now covers DOM reconciliation, keyed list reorder timing, large server-rendered hydration timing, slot-heavy projection hydration, slot-heavy content updates, and slot-heavy keyed reorders with enforced budgets. A Chromium-only CDP regression test now performs 25 mount/update/unmount cycles, with 3 updates and 40 keyed nodes per cycle. It forces garbage collection before and after the workload, records `Runtime.getHeapUsage`, writes before/after `.heapsnapshot` artifacts through `HeapProfiler.takeHeapSnapshot`, asserts zero residual probe hosts/roots, and fails if retained post-GC heap growth exceeds 8 MiB. The test is intentionally Chromium-only because Playwright exposes the CDP `HeapProfiler` there; lifecycle residual-DOM assertions remain available in the cross-browser fixture suite. Historical trend storage and repeated-run percentile aggregation remain follow-up work.

## Reproduction

```bash
npm run benchmark
npm run benchmark:memory
npm run test:browser
```

Raw machine-generated outputs are stored in `benchmark-results/v3.json` and `benchmark-results/memory-v3.json`.
