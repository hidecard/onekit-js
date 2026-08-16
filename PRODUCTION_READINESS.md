

## Developer-experience readiness

The V3 beginner-facing API is production-ready as an additive compatibility layer when the application uses the documented contracts:

| Area | Production contract | Validation |
|---|---|---|
| State | `state(object)` returns the existing reactive proxy contract; `state(primitive)` returns an explicit `.value` ref. | Ergonomic state regression tests and the existing reactive suite. |
| Derived values | `derive(getter)` preserves cached `computed` semantics. | Derived-value invalidation and evaluation-count tests. |
| Effects | `watchEffect(fn)` returns an idempotent disposer. | Disposer test plus existing effect cleanup tests. |
| Root application | `createApp(definition).mount(target, props)` creates setup state before the initial render. | DOM mount, prop, and unmount integration test. |
| Compatibility | Existing `reactive`, `computed`, `effect`, `watch`, `register`, `create`, and `mount` APIs remain exported. | Type-check, full Jest suite, production bundle, and package verification. |

The ergonomic layer intentionally does not promise runtime-only syntax such as making a JavaScript primitive binding `count++` reactive. Any future shorthand must be implemented by an explicit compiler transform, documented as opt-in, and covered by source-map, SSR, hydration, and HMR tests.

Before publishing a release that includes these APIs, run `npm run type-check`, `npm test -- --runInBand`, `npm run build`, and `npm run verify:package`. The current implementation has been validated against the existing V3 suite and package verification workflow.

## V3.1.16 Production Boundary Additions

The V3 package now exposes feature-oriented subpaths for `animation`, `api`, `a11y`, `storage`, `ergonomics`, and `web-components`. These paths are verified in both ESM and the supported CommonJS package boundary, alongside the root, SSR, Vite, and CLI entry points.

API requests with `timeout` now participate in the configured retry policy. A timeout is retried with the same `retries` and `retryDelay` settings as network and HTTP failures. Storage key enumeration isolates malformed records so one corrupted entry cannot hide healthy records from `keys()` and `size()`.

The package verification script installs the packed tarball into a clean temporary consumer project and imports the supported entry points directly. This check is part of the release validation matrix together with type-checking, Jest coverage, production build, HMR smoke verification, and documentation build.


## Navigation and Hydration Hardening

The router treats a configured `base` path as a deployment prefix rather than a route definition. Route declarations remain application-relative while browser history URLs retain the configured base. Nested routes inherit parent and child dynamic parameters in the final `RouteLocation`.

Hydration reports serializable attribute mismatches in addition to tag, text, missing-node, and unexpected-node mismatches. Event handlers are attached without rewriting server-rendered DOM, and `HydrationResult.dispose()` removes them deterministically. Style object attributes use the same `property:value` representation during comparison as server rendering.

## V3.1.16 Renderer Fragment Contract

The V3 renderer treats fragment updates as a multi-node reconciliation boundary. When a fragment changes shape, stale nodes are removed as a group, the new fragment is inserted at the original sibling position, and following siblings remain intact. This contract is covered by root-fragment and nested-fragment regression tests alongside keyed child retention, event replacement, stale prop removal, and refs.


## V3.1.16 Runtime Concurrency Contracts

Effects may register per-run cleanup callbacks through the optional `onCleanup` argument. OneKit invokes the previous run's callbacks before dependency collection begins and invokes the final callbacks when the effect is stopped or its owning scope is disposed. Cleanup failures are isolated and do not prevent dependency teardown.

Router navigation is last-write-wins for asynchronous guards and loaders. If a newer navigation begins before an older one finishes, the older result is discarded before history, `current`, handlers, subscribers, or `afterEach` are updated. Calling `router.stop()` also invalidates pending navigations.

Loading and error boundaries protect their state from stale asynchronous completions. A newer boundary run or `reset()` prevents an older promise from replacing the latest ready value, error, or pending state. These contracts are covered by focused concurrency regression tests.

Nested `batch()` calls share one flush boundary. Effects queued by an inner batch are not flushed until the outermost batch completes, preserving deterministic one-run scheduling for grouped updates.


## V3 Security Hardening

The runtime now applies a shared URL and CSS-value policy at both the client VDOM and SSR boundaries. `javascript:`, `vbscript:`, and `data:` URLs are rejected for navigational/resource attributes, string-valued `on*` props are never serialized or installed as DOM attributes, and dangerous CSS script-binding patterns are removed. SSR attribute escaping remains enabled for text and attribute values.

Storage-key validation and safe cloning avoid prototype-pollution key paths and do not rely on an attacker-controlled `hasOwnProperty` method. The dependency audit for the production dependency set reported no known vulnerabilities at the time of this audit, and the packed-package verification passed in a clean temporary consumer project.

These controls reduce framework-level XSS and prototype-pollution risk but do not make arbitrary application input safe by default. `addScript`, `addToHead`, and `addToBody` accept trusted raw markup by design; applications must not pass untrusted strings to them. Applications should also deploy a restrictive CSP, validate authorization on the server, avoid exposing secrets in browser bundles, and keep dependencies and the runtime updated.

## V3 React/Vue Parity Foundations

Hydration now compares case-insensitive attribute names, boolean properties, meaningful whitespace, object-style values, fragments, and nested component output while preserving server DOM. Hydration listeners remain disposable through `HydrationResult.dispose()` and parity issues remain observable through `mismatches`.

The package now provides `onekit-js/testing` with DOM-first `renderTest`, `cleanup`, `fireEvent`, `flush`, and `waitFor` helpers. It also provides `onekit-js/query` with request deduplication, stale-time reads, subscriptions, invalidation, manual updates, and cache removal, plus `onekit-js/forms` with typed values, touched state, synchronous/asynchronous validation, guarded submission, reset, and subscriptions. These are deliberately small framework primitives and do not claim to replace a complete server-state, schema-validation, or browser-E2E ecosystem.

The parity milestone was validated with type-checking, 22 Jest suites and 106 tests, production build, clean package verification, and diff checks. Build warnings for the Vite integration's intentionally external `node:fs`, `node:path`, and `typescript` imports remain non-blocking and are documented as integration-boundary warnings.
