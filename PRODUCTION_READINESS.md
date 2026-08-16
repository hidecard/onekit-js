

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
