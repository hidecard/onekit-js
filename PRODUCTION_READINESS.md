

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
