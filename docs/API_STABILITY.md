# OneKit JS V3 API Stability Matrix

This document defines the public-contract policy for OneKit JS `3.1.19`. A **Stable** API has a documented signature, declaration output, ESM/CJS import coverage, regression tests, and backward-compatibility expectations within the V3 major line. An **Experimental** API is public and usable, but its scheduling, adapter, or platform behavior may receive additive changes before a future stability declaration. An **Internal** API is not part of the supported application contract and may change without notice.

## Public stability matrix

| Surface | Status | Contract and validation |
|---|---|---|
| Reactive primitives, components, VDOM, JSX, refs, named slots, stores, forms, query client | Stable | Type declarations, Jest regression coverage, and root/subpath ESM/CJS import checks. |
| Router navigation, params, query parsing, guards, loaders, prefetch, memory/hash/history modes | Stable | Browser and memory tests cover the documented navigation contract. Route cache policy and broader browser compatibility remain framework-level follow-up work. |
| SSR string rendering, hydration diagnostics, request context, metadata, boundary primitives | Stable baseline | Escaping, context isolation, hydration mismatch reporting, listener disposal, and boundary behavior are tested. Advanced async scheduling and platform-specific streaming behavior remain Experimental. |
| Streaming SSR, progressive boundary scheduling, adapter `scheduleBoundary` hooks | Experimental | Additive adapter contract with cancellation and error tests; queue and back-pressure behavior remains platform-dependent. |
| `createApi`, `createServerApp`, Node HTTP bridge, server data, auth contracts, CORS, rate limiting, database adapter boundaries | Stable baseline | Adapter-neutral request handling and Node integration are tested. Credentials, migrations, pool lifecycle, vendor drivers, and distributed deployment remain application responsibilities. |
| File-based route helpers and generated route metadata | Experimental | Public helpers exist, but the full project-level file-system route convention and generated typed route pipeline are not yet a stable framework contract. |
| Vite plugin, HMR preservation, CLI project workflow | Stable baseline | Build, dev, preview, test, package, and plugin acceptance checks are required for release validation. Plugin extension hooks remain Experimental. |
| Web Components integration, accessibility helpers, storage, animation, head management | Stable | Public declarations and subpath imports are covered; browser-specific behavior follows the documented platform limits. |
| Runtime diagnostics and error reporting | Stable baseline | Normalized error reports and isolated reporter failures are covered; external telemetry transport is application-owned. |

## Release gates

Every release candidate must pass type checking, Jest, production build, declaration verification, package verification, and the API contract check:

```bash
npm run type-check
npm test -- --runInBand
npm run build
npm run verify:declarations
npm run verify:api-contract
npm run verify:package
```

`npm run verify:api-contract` reads the package `exports` map, verifies that every advertised runtime target exists, and imports each runtime subpath through both ESM and CommonJS resolution. It is intentionally separate from symbol-level package verification so that an export-map typo fails before publication even when an individual smoke test does not exercise that subpath.

## Compatibility policy

The V3 major line may add exports and optional capabilities without breaking existing imports. Existing Stable signatures, return shapes, lifecycle rules, and documented error behavior require a migration note before a breaking change. Experimental APIs must carry an explicit label in their API documentation and release notes. Removing or materially changing an Experimental API still requires a changelog entry and a migration note when users could reasonably have adopted it.

Browser support, SSR adapter support, and backend driver support are separate contracts. The core package does not bundle database or Redis vendor drivers, and applications remain responsible for credentials, migrations, indexes, retries, connection pools, and deployment-specific resource limits.

## Current audit notes

The repository's current test and performance documentation should use the latest validated count consistently. At the time of this audit, the browser-hardening work reports **195 Jest tests**, while older production-readiness wording still contains **192 tests** and should be corrected in the next documentation synchronization pass.
