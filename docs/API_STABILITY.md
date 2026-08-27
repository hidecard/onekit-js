# OneKit JS V3 API Stability Matrix

This document defines the public-contract policy for OneKit JS `3.1.19`. A **Stable** API has a documented signature, declaration output, ESM/CJS import coverage, regression tests, and backward-compatibility expectations within the V3 major line. An **Experimental** API is public and usable, but its scheduling, adapter, or platform behavior may receive additive changes before a future stability declaration. An **Internal** API is not part of the supported application contract and may change without notice.

## Public stability matrix

| Surface | Status | Contract and validation |
|---|---|---|
| Reactive primitives, components, VDOM, JSX, refs, named slots, stores, isolated store registries, forms, query client | Stable | Type declarations, Jest regression coverage, and root/subpath ESM/CJS import checks. |
| Router navigation, params, query parsing, guards, loaders, prefetch, memory/hash/history modes, optional `createRouterView()` binding, one-shot route-data snapshot handoff, and shared query tags | Stable baseline | Browser and memory tests cover navigation, VDOM target replacement/cleanup, matching SSR data reuse, mismatch fallback, and query-backed loader reuse. Full application transport integration and route cache ownership remain framework-level follow-up work. |
| Query persistence, `revalidate`, tags, tag invalidation/revalidation, and optional `createQueryBroadcastSync()` invalidation bridge | Stable baseline | IndexedDB, storage lifecycle, privacy-preserving key/tag messages, tag-preserving dehydration, revalidation, and listener disposal are covered. Cross-tab data transfer and conflict resolution remain application-owned. |
| SSR string rendering, hydration diagnostics, request context, metadata, boundary primitives, and trusted Router data snapshots | Stable baseline | Escaping, context isolation, hydration mismatch reporting, listener disposal, boundary behavior, and one-shot route-loader handoff are tested. The explicit route-data transport is separately Experimental because adapter, replay, secret, and deployment policies remain application-owned. |
| Streaming SSR, progressive boundary scheduling, adapter `scheduleBoundary` hooks | Experimental | Additive adapter contract with cancellation and error tests; queue and back-pressure behavior remains platform-dependent. |
| `createApi`, `createServerApp`, Node HTTP bridge, server data, auth contracts, CORS, rate limiting, standard HTTP method helpers, database adapter boundaries | Stable baseline | Adapter-neutral request handling, bodyless HEAD responses, explicit OPTIONS routes, and Node integration are tested. Credentials, migrations, pool lifecycle, vendor drivers, and distributed deployment remain application responsibilities. |
| File-based route helpers, generated route metadata, declaration-only route-path/module types, explicit composition helper, prerender/SSG hook, and opt-in Vite virtual route module | Experimental | Bundler-safe helpers cover configurable extensions, index/page, dynamic, catch-all, optional catch-all, route groups, deterministic literal/ambiguous-pattern conflict diagnostics, layouts, middleware metadata, explicit associations, `FileRoutePath`/`FileRouteParams`, `FileRouteLoaderData`/`FileRouteComponentProps`, and `composeFileRouteInfrastructure()`. Prerendering accepts only application-selected concrete paths and writes safe static output; automatic runtime composition, ISR, and deployment integration remain outside the stable framework contract. |
| Vite plugin, HMR preservation, CLI project workflow, and opt-in Server/Client import-boundary validator | Stable baseline / Experimental extension | Build, dev, preview, test, package, and plugin acceptance checks are required for release validation. The validator now recognizes `"use client"`/`"use server"`, `server-only`/`client-only` markers, and transitive static client-to-server paths, but it does not transform modules, split bundles, serialize props, provide RSC/Flight, or replace deployment isolation. |
| Secure SSR route-data transport helpers | Experimental | JSON-safe filtering, redaction/exclusion, size/depth/string limits, expiry, URL binding, optional Web Crypto HMAC signing, fail-closed parsing, and explicit Router/QueryClient application are tested. Applications own embedding, key storage/rotation, replay policy, authorization, and adapter integration. |
| `prerenderRoutes()` and Vite `fileRoutes.prerender` integration | Experimental | Deterministic sequential rendering, duplicate-path removal, abort behavior, traversal-safe output paths, VNode/RenderResult normalization, output writing, and page callbacks are tested. Applications select dynamic paths, own authorization/data loading, and retain deployment/ISR ownership. |
| `createISRRenderer()`, `ISRCache`, and tag-aware page revalidation | Experimental | Fresh-hit, stale-while-revalidate, missing-page regeneration, single-flight concurrency, failure retention, tag invalidation, QueryClient coordination, and memory-cache behavior are tested. Durable storage, distributed locks, eviction, authorization, webhook verification, and deployment headers remain application-owned. |
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

The published `3.1.19` release records **195 Jest tests**. The current continuation working tree adds secure route-data, cache tags, file-route conflicts/associations, generated declaration/module coverage, explicit composition, prerender/SSG coverage, ISR cache-aware revalidation, and transitive component-boundary coverage; the final release count is regenerated after the complete validation matrix and release artifacts are updated. Release-facing historical counts remain tied to the version they describe until the next package release is cut.
