# Changelog

## [Unreleased]

The V3 branch continues production hardening after `3.1.19` without changing the published version contract. This release line now includes the first all-in-one backend foundation for full-stack applications.

### Added

- Add normalized runtime error reports through `createErrorReport(error, context)` and an opt-in `setErrorReporter()` hook for application-owned telemetry.
- Add the DevTools `runtime:error` event with bounded, detached diagnostic snapshots when the opt-in bridge is enabled.
- Dispose VDOM event listeners across replaced subtrees, including descendant nodes, alongside existing ref cleanup.
- Add regression coverage for reporter isolation, error normalization, DevTools runtime errors, and stale listener disposal.
- Add a Fetch-compatible `createServerApp()` with Express-style route methods, ordered middleware, decoded route params, query parsing, safe JSON/text responses, per-request state, and adapter-neutral `Request`/`Response` handling.
- Add `validateBody()` for JSON body validation and built-in `serverMiddleware.requestId()` and `serverMiddleware.cors()` helpers.
- Reuse the existing `DependencyInjector` through each server request context for Nest-style service composition without introducing decorators or a deployment-specific runtime.
- Add the beginner-friendly `createApi()` alias and `context.ok()`, `context.json()`, `context.text()`, and `context.fail()` helpers so common handlers can be written without manual `Response` construction.
- Add `defineHandler()` for explicit concise handlers while keeping the existing middleware-compatible handler signature available.
- Add `createNodeHandler()` to bridge Node HTTP request/response objects to the Fetch-compatible `ServerApp` without importing Node modules into browser-oriented code.
- Add Node adapter regression coverage for request-body streaming, response status/headers, and JSON payload serialization.
- Add beginner-friendly `securityMiddleware.authenticate()` and `securityMiddleware.authorize()` contracts that keep verified application users in request state and return safe `401`/`403` responses.
- Add `securityMiddleware.session(provider)` and `securityMiddleware.token(provider)` adapters for application-owned session and token verification logic.
- Add a typed `DatabaseAdapter`/`DatabaseTransaction` contract and expose an optional request-scoped `context.database` without bundling an ORM or database driver.
- Add one-read typed `context.body<T>()` parsing and `app.resource(path, { list, get, create, update, remove })` CRUD route registration to reduce repetitive backend code.
- Add regression coverage for resource routes, body helpers, database context, and provider middleware contracts.
- Add bounded in-memory `securityMiddleware.rateLimit()` with configurable keying, `429` responses, retry hints, and standard rate-limit headers.
- Add a portable `RateLimitStore` contract, `createMemoryRateLimitStore()` helper, and beginner-friendly `serverMiddleware.rateLimit()` alias so Redis, database, or edge-backed counters can be injected without changing route code.
- Add optional driver-injected `createRedisRateLimitStore()` using one atomic EVAL script for distributed counters and expiry, without bundling a Redis client into the core package.
- Add optional driver-injected `createMySQLAdapter()` for mysql2-compatible pools and `createMongoDBAdapter()` for MongoDB-compatible clients. MySQL follows the relational `DatabaseAdapter` contract; MongoDB exposes a document-native typed collection boundary.
- Forward custom `onekit build --out-dir <directory>` values to delegated Vite-style project build scripts while preserving default build-script compatibility.
- Harden global middleware dispatch so middleware runs for missing routes, and add configurable CORS preflight handling with `204` responses and standard method/header/credential/max-age headers.
- Add idempotent `app.start()`/`app.stop()` lifecycle hooks with `onStart`/`onStop` callbacks, concurrent shutdown coalescing, and automatic closing of the optional database adapter after application shutdown.
- Add typed `ServerError`, `createServerError()`, and `serverErrorResponse()` contracts for safe public application failures with status, code, details, headers, and production message redaction.
- Add a resilient `errorResponse` hook; custom error hooks are isolated so telemetry failures fall back to a safe `500` response.
- Add `onekit create <name> --full-stack` with a minimal Node HTTP API entrypoint, health route, graceful shutdown, `dev:server`/`start` scripts, and `.env.example`.
- Add adapter-neutral `createServerData()` resources with request/abort context, concurrent-load deduplication, optional TTL caching, invalidation, and injectable cache storage.
- Add `createMemoryServerDataCache()` as a small reference cache without coupling the framework to Redis, an ORM, or a database driver.
- Add decorator-free `defineModule()`, `defineController()`, and `app.module()` composition APIs for nested imports, providers, middleware, controller prefixes, and grouped routes.
- Add an optional driver-injected `createSQLiteAdapter()` that maps better-sqlite3-compatible prepared statements, async transaction boundaries, insert IDs, and close behavior to `DatabaseAdapter` without bundling a native driver.
- Add an optional driver-injected `createPostgreSQLAdapter()` that maps pg-compatible pool queries, dedicated-client transactions, rollback/release behavior, pool shutdown, and optional `RETURNING` insert IDs without bundling `pg`.
- Add optional adapter-level SSR boundary scheduling through `StreamingRenderer.renderToStream({ scheduleBoundary })`, preserving the default in-order streaming behavior while allowing platform queues and back-pressure policies to control deferred payload emission.
- Add a versioned public API stability matrix covering Stable, Experimental, and application-owned contracts across the root package and runtime subpaths.
- Add `scripts/verify-api-contract.mjs` and `npm run verify:api-contract` to verify all advertised ESM/CJS runtime exports before publishing.
- Add four-browser Playwright timing coverage for keyed reorders, DOM-heavy patches, SSR hydration, and slot-heavy hydration/update/reorder workloads with warning and hard budgets.
- Add the optional SSR-safe `createIndexedDBQueryStorage()` adapter for browser query-cache persistence without coupling the framework to a storage library.
- Add the opt-in `createQueryBroadcastSync()` bridge for application-controlled cross-tab invalidation; only normalized query keys are broadcast, never cached data or errors.
- Add `createRouterView()` and `subscribeMatched()` for optional committed-route VDOM rendering with application-owned route-to-view mapping, not-found clearing, and disposal.
- Fix repeated `Router.start()` calls to return the existing committed `MatchedRoute`, including resolved loader data and lazy components, without rerunning navigation work.
- Fix store `$reset()` to remove keys that are absent from the initial state and add `$dispose()` for explicit registry and subscription cleanup.
- Add `createStoreRegistry()` with isolated store maps, plugins, and disposal for SSR/concurrent-request boundaries without changing the existing global store helpers.
- Add explicit `app.head()` and `app.options()` server helpers, with bodyless HEAD response finalization that preserves status and headers.
- Return `405 Method Not Allowed` with an aggregated `Allow` header when a registered path receives an unsupported method.
- Extend bundler-safe file routes with route groups, optional catch-all segments, optional dynamic URL generation, and matching coverage while keeping filesystem access outside the runtime.
- Add versioned `Router.dehydrate()`/`Router.hydrate()` route-data snapshots so a trusted SSR match can be reused once by a matching client start without rerunning loaders.
- Propagate a navigation-scoped `AbortSignal` to guards/loaders and treat router-owned superseded-navigation aborts as silent stale results while preserving current-navigation errors.
- Add an opt-in Vite virtual route module with deterministic pages/layouts/middleware metadata and an experimental `"use client"`/`"use server"` import-boundary validator.
- Flush the last scheduled query-cache persistence update when `QueryClient.dispose()` is called, preventing lifecycle teardown from silently dropping cache changes.
- Add Chromium CDP lifecycle heap snapshots, retained post-GC heap-growth enforcement, cache-backed trend comparison, and GitHub Actions diagnostic artifacts.
- Add a versioned SSR route-data envelope with JSON-safe filtering, configurable size/depth/string limits, expiry, URL binding, redaction/exclusion hooks, optional Web Crypto HMAC signing, fail-closed parsing, and explicit Router/QueryClient hydration application.
- Add shared QueryClient cache tags, `revalidate` freshness aliases, tag invalidation/revalidation, tag-preserving dehydration, and tag-only cross-tab invalidation messages.
- Extend the Vite file-route plugin with configurable extensions, deterministic duplicate literal/ambiguous dynamic-path diagnostics, generated route entry/path metadata, a declaration-only `FileRoutePath`/`FileRouteParams` virtual module, explicit layout/middleware associations, and relative-root normalization.
- Add `composeFileRouteInfrastructure()` for application-owned resolution of page routes with ordered directory-scoped layouts and middleware without silently mutating Router behavior.
- Add `prerenderRoutes()` for deterministic sequential rendering of application-selected concrete paths with abort handling, duplicate removal, VNode/RenderResult normalization, traversal-safe output behavior, and page callbacks.
- Add opt-in Vite `fileRoutes.prerender` integration with safe `<path>/index.html` output and a dedicated `onekit-js/prerender` export.
- Add generated `FileRouteModuleFor<Path>`, `FileRouteLoaderData<Path>`, and `FileRouteComponentProps<Path>` declarations mapped to discovered route modules.
- Add `createISRRenderer()`, `ISRCache`, and `createMemoryISRCache()` with fresh-hit, stale-while-revalidate, missing-page regeneration, single-flight concurrency, failure retention, cache-entry enumeration, tag invalidation, and optional QueryClient coordination.
- Add the dedicated `onekit-js/isr` package subpath for server-side cache-aware revalidation imports.
- Extend `StreamingRenderer` with escaped inert route-data and experimental RSC-style payload script handoff plus `readStreamingPayloads()` extraction.
- Add experimental `onekit-js/rsc` primitives for bounded versioned Flight-like records, explicit client references, fail-closed decoding, explicit reference resolution, and abort-aware streaming.
- Strengthen the opt-in component boundary validator with `server-only`/`client-only` marker imports and transitive static graph checks while preserving server-to-client composition.
- Correct the GitHub Actions Edge matrix to target the configured Playwright `edge` project, install the `msedge` channel, and record cache-backed per-browser performance history.

### Documentation

- Update the README feature map and production-parity guidance for runtime diagnostics and VDOM teardown behavior.
- Keep production-readiness guidance explicit about reviewing and redacting error messages and stack traces before external forwarding.
- Document the all-in-one backend workflow, adapter boundary, server-only responsibilities, and current limits in the README.
- Make the shortest backend learning path the default README example, while retaining the lower-level API for advanced applications.
- Document the Node HTTP adapter, security middleware, typed database adapter, session/token providers, `context.body<T>()`, and `app.resource()` examples while keeping provider verification, distributed stores, and decorator-module boundaries explicit.
- Document typed server errors, safe error serialization, resilient error hooks, the optional full-stack CLI starter workflow, server-data/cache boundaries, functional module/controller organization, optional SQLite/PostgreSQL/MySQL database adapters, the document-native MongoDB adapter boundary, the optional Redis rate-limit store boundary for Node deployments, and SSR adapter-level boundary scheduling with its cancellation/back-pressure responsibilities.
- Document the public API stability policy, ESM/CJS export contract, browser performance budgets, lifecycle heap methodology, cache-backed trend warnings, file-route conventions, generated route/data/props types, explicit infrastructure composition, prerender/SSG constraints, the experimental Vite virtual route/component-boundary plugin, the secure SSR route-data envelope and shared cache-tag policy, the React/Next.js/Express parity boundaries, and the reproducible CI commands in the README and dedicated guides.

### Validation

- The focused observability, VDOM, CLI, and server suites pass, together with strict TypeScript checking and the full Jest matrix; the CLI suite covers ten tests and the server regression suite covers fourteen tests.
- The latest focused validation passes strict `type-check`; the server production suite covers **18 tests**, the SSR production suite covers **12 tests** including adapter scheduling, and the SQLite, PostgreSQL, Redis, MySQL, and MongoDB adapter suites add **12 tests** for database mapping, transactions, rollback, pool/client lifecycle, distributed counter/TTL mapping, and document collection operations. The full release matrix is run after documentation and integration changes are complete. The generated TypeScript starter also passes npm install, type-check, its smoke test, and Vite production build.
- The Vite plugin build still prints expected non-fatal externalization notices for `node:fs`, `node:path`, and `typescript`; these are intentional server/tooling externals and do not fail the build.
- The current increment passes the new secure transport/cache-tag and file-route/boundary focused suites; the final release matrix must regenerate `dist` and repeat all package, declaration, API, HMR, docs, audit, and browser checks.
- The published `3.1.19` baseline records 195 tests; the current continuation working tree validates **36 Jest suites / 211 tests**, 22 ESM/CJS runtime exports, Chromium browser coverage, and the Chromium lifecycle heap test. Historical release counts remain version-specific until the next package release.

## [3.1.19] - 2026-08-18

OneKit JS `3.1.19` is a **V3 production-parity patch release** that adds progressive SSR boundaries, client continuation, persisted query cache state, and automatic focus/reconnect revalidation while preserving the existing V3.1.18 contracts.

### Added

- Add progressive streaming SSR boundary chunks with visible fallback shells, deferred content chunks, abort/error handoff, and an import-safe client continuation helper.
- Add configurable `QueryClient` persistence with storage adapters, cache keys, max-age expiry, restore, and best-effort storage failure handling.
- Add automatic query revalidation on browser window focus and network reconnect, with lifecycle disposal for long-lived applications and tests.
- Add regression coverage for SSR fallback/content continuation, query persistence restore/expiry, focus/reconnect events, and listener disposal.

### Documentation and readiness

- Document progressive SSR boundaries and query persistence/revalidation in the V3 Usage Guide.
- Synchronize the Production Readiness Guide and roadmap with the completed parity milestones.
- Update the generated Vite starter to use the installable compatibility floor `onekit-js@^3.1.18`; its caret range resolves the newest compatible V3 release, including the published `3.1.19` release.

### Compatibility and boundaries

- Existing `StreamingRenderer` behavior remains backward compatible; progressive boundaries are additive and opt-in through the new boundary contract.
- Existing `QueryClient` cache, invalidation, mutation, retry, cancellation, and hydration APIs remain available.
- Persisted query state is untrusted transport data. Applications should use a versioned key, validate restored values, and avoid persisting secrets or request-scoped credentials.
- This patch does not yet claim full React Server Components, Next.js server actions, or keyed component reconciliation parity.

### Validation

The V3 branch changes were validated with strict TypeScript compilation, focused SSR and query production suites, the full Jest suite, production build, declaration verification, package verification, HMR smoke checks, generated starter checks, and `git diff --check`.

### Upgrade references

- [V3 Usage Guide](docs/V3_USAGE.md)
- [Production Readiness Guide](docs/PRODUCTION_READINESS.md)
- [V3 Migration Guide](MIGRATION_GUIDE.md)

## [3.1.18] - 2026-08-17

OneKit JS `3.1.18` is a **V3-line production release** focused on typed routing, nested route composition, SSR/hydration observability, query lifecycle control, explicit runtime boundaries, and a more useful generated starter. It is intended to be compatible with existing V3 applications; applications migrating from OneKit 2.x or the legacy global runtime should follow the full [Migration Guide](MIGRATION_GUIDE.md).

### Added

#### Typed routing and route composition

- Add generic route contracts for params, loader data, and application context through `Route<Params, Data, AppContext>`, `RouteContext<Params, AppContext>`, and `RouteLoader<Params, Data, AppContext>`.
- Add `RouteLoaderData<Loader>` to infer the awaited return type of a route loader without duplicating its result type.
- Add `RouteContextFor<Path, AppContext>`, `RouteParamsFor<Path>`, `TypedRoute`, and `RouteDataFor` helpers for path-specific TypeScript inference.
- Add `defineRoute()` and `defineLayoutRoute()` helpers for typed route declarations and nested layout metadata.
- Add file-based route discovery through `createFileRoutes()` from bundler module maps, with `routeHref()` for typed parameterized URLs.
- Preserve parent-to-leaf route data through `MatchedRoute.dataByRoute` while keeping `MatchedRoute.data` as the leaf result for V3 compatibility.
- Expose optional application services through `RouterOptions.context` and pass them consistently to guards, loaders, query-key factories, handlers, and `afterEach` callbacks.

#### SSR, streaming, and hydration

- Add JSON-safe `createRouteManifest()` and `Router.getManifest()` output for preload planning and client hydration preparation. Function-valued behavior is intentionally excluded from serialized manifests.
- Add structured hydration mismatch diagnostics with callback reporting and an opt-in throw policy for applications that treat mismatches as deployment failures.
- Add streaming renderer error handoff through `onError`, allowing applications to log, format, or terminate failed streams according to their server policy.
- Preserve request-scoped SSR data handoff through typed query `dehydrate()` and `hydrate()` APIs; pending loader promises are not serialized.

#### Query lifecycle and runtime safety

- Extend `QueryClient` with `invalidate()`, `invalidateQueries()`, mutations, retry policies, cancellation, optimistic updates, rollback handling, and lifecycle callbacks.
- Keep router/query integration opt-in through route `queryKey`, `queryOptions`, and `RouterOptions.queryClient`; routes without a query key retain uncached loader behavior.
- Add explicit runtime helpers: `isServerRuntime()`, `isClientRuntime()`, `serverOnly()`, and `clientOnly()`.

#### Starter and documentation

- Refresh the generated starter with a responsive Vite/React-inspired workspace, live reactive counter, quick-start guidance, feature cards, and the V3 dark indigo/lavender visual language.
- Add the dedicated [`V3 Release Notes`](docs/V3_RELEASE_NOTES.md) document and synchronize the [README](README.md), [Migration Guide](MIGRATION_GUIDE.md), [V3 Usage Guide](docs/V3_USAGE.md), and generated declaration artifacts.

### Changed

- Update generated starter dependencies to `onekit-js@^3.1.18`.
- Prepare and document the companion starter package as `create-onekit@1.0.8`.
- Treat router manifests as preload and hydration metadata rather than authorization data.
- Keep route rendering application-owned: the router resolves navigation and data but does not implicitly render route components.
- Make application context optional so existing V3 callbacks using only `to` and `from` continue to work without migration changes.

### Fixed

- Ensure application context is initialized from `RouterOptions.context` and is available on navigation contexts rather than being silently omitted.
- Ensure typed route declarations accept readonly nested route collections without forcing callers to widen literal arrays.
- Ensure route loader results are assigned consistently to leaf `data` and ordered `dataByRoute` records during nested navigation.
- Refresh generated ESM, CommonJS, UMD, minified, source-map, and declaration artifacts after the router contract changes.
- Keep stale asynchronous navigation and route-loader completion from overwriting a newer navigation result.

### Security and operational notes

- Continue to treat route manifests, dehydrated query state, and serialized SSR payloads as untrusted transport data; escape and validate them at the application boundary.
- Keep server-only services out of client bundles and use the runtime boundary helpers around browser globals and request-scoped services.
- Do not execute remote template expressions or treat sanitized external HTML as trusted application code.

### Compatibility

- **V3 applications:** Compatible upgrade. Update `onekit-js` to `3.1.18`, run type-check/tests/build/package verification, and adopt the new typed APIs incrementally.
- **OneKit 2.x or legacy global applications:** Major migration work remains necessary. Replace global access with named imports and follow [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md).
- **Starter projects:** New projects should use `create-onekit@1.0.8`; existing generated projects should compare their starter files before regenerating.

### Validation

The V3 branch release was validated with strict TypeScript compilation, the complete Jest suite, production builds, declaration export checks, clean package installation, package entrypoint checks, generated starter verification, and `git diff --check`. The typed-loader milestone also includes a regression test proving that application context reaches guards and loaders and that loader data remains available on the navigation result.

### Upgrade references

- [V3.1.18 Release Notes](docs/V3_RELEASE_NOTES.md)
- [V3 Migration Guide](MIGRATION_GUIDE.md)
- [V3 Usage Guide](docs/V3_USAGE.md)
- [Production Readiness Guide](docs/PRODUCTION_READINESS.md)

All notable changes to OneKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.17] - 2026-08-16

### Added
- Add the TypeScript automatic JSX runtime subpath at `onekit-js/jsx-runtime` with `jsx`, `jsxs`, `jsxDEV`, and `Fragment` helpers.
- Add opt-in DevTools performance measurements for synchronous and asynchronous tasks with success/error events.
- Extend clean packed-package verification to cover the ESM and CommonJS `jsx-runtime`, query, forms, testing, and router subpath exports.
- Expand V3 CI with strict TypeScript, declaration export, full dependency audit, and whitespace validation checks across the Node 18/20/22 matrix.
- Add SSR-safe metadata/head helpers with escaped title, description, canonical, Open Graph, and Twitter rendering plus browser lifecycle management.
- Extend packed-package verification to cover the `onekit-js/head` ESM and CommonJS subpath exports.
- Add typed `QueryClient.dehydrate()` and `hydrate()` APIs for request-scoped SSR data handoff without serializing pending loader promises.
- Add optional router `queryKey`, `queryOptions`, and `queryClient` integration so route loaders can reuse hydrated and stale-time-controlled query data while preserving uncached loader behavior by default.
- Add router `loadingBoundary` and `errorBoundary` composition for stale-safe route loader pending/error states.
- Add JSON-safe `createRouteManifest()` and `Router.getManifest()` helpers for SSR preload planning and client hydration optimization; function-valued route behavior is excluded from the manifest.

### Fixed
- Ship the `query`, `forms`, and `testing` TypeScript declaration artifacts referenced by the package root exports.
- Add declaration export verification to the publish validation workflow.
- Update the README and starter CLI documentation for OneKit JS `3.1.18` and `create-onekit` `1.0.8`.

## [3.1.16] - 2026-08-16

### Added
- Add production feature subpath exports for `api`, `storage`, `a11y`, `animation`, `ergonomics`, `web-components`, `testing`, `query`, and `forms`.
- Add hydration parity checks for case-insensitive attributes, boolean properties, meaningful whitespace, object styles, fragments, and nested component output.
- Add DOM-first testing helpers (`renderTest`, `cleanup`, `fireEvent`, `flush`, and `waitFor`), a deduplicating `QueryClient`, and typed form state with validation, submit, reset, and subscriptions.
- Add router `prefetch()` for guard/loader data warming without committing navigation state, browser history, handlers, or subscribers.
- Add nested typed route records with parent-to-leaf matching, merged params, ordered guards/loaders, lazy components, `dataByRoute`, composed `components`, and non-breaking `routeMatches` navigation context.
- Add effect cleanup callbacks, nested-batch scheduling guarantees, last-write-wins router navigation, and stale-promise protection for async boundaries.
- Extend packed-package verification to cover ESM and CommonJS feature entry points.
- Add regression coverage for API timeout retries and storage key enumeration with corrupted records.
- Add adversarial security coverage for VDOM and SSR URL, event-attribute, style, and prototype-pollution boundaries.

### Fixed
- Apply the configured retry policy to request timeouts, matching network and HTTP failure behavior.
- Prevent stale asynchronous route loaders and boundary runs from overwriting the latest application state or notifying subscribers after a newer operation wins.
- Prevent one malformed storage record from hiding healthy keys and size information.
- Reject unsafe URL protocols and string event attributes at client VDOM and SSR boundaries, filter dangerous CSS values, and harden safe cloning against attacker-controlled object methods.


## [3.1.13] - 2026-08-15

### Added
- Add production-ready V3 disposable effect scopes, automatic component/store/router teardown, live DevTools inspectors, lifecycle events, and development leak diagnostics.
- Add the restricted template expression AST evaluator and remove dynamic `new Function()` execution from template compilation.
- Add the Vite HMR plugin, HMR state preservation helper, package subpath export, and repeatable V3 benchmark harness.

### Fixed
- Make Rollup builds portable across Node 18, Node 20, and Node 22 CI environments by handling Web Crypto availability and skipping incompatible terser minification only on Node 18.
- Build generated Vite artifacts before clean package verification so `onekit-js/vite` is validated from the packed tarball.
- Extend automated coverage for disposable scopes, DevTools inspectors, component/store lifecycle events, and package entrypoints.

## [3.1.12] - 2026-08-15

### Added
- Add bounded DevTools event history with detached snapshots, metadata inspection, clear, and dispose controls.
- Add optional browser-global installation for development inspectors without mutating SSR globals.
- Add isolated `verify:package` clean-install verification for root, ESM, CJS, SSR, and CLI entrypoints.
- Add the complete V3 developer migration guide with before/after migrations, runnable application examples, router/store/SSR/hydration walkthroughs, testing guidance, troubleshooting, and release checklists.
- Add GitHub Actions CI for Node 18, 20, and 22.
- Add regression coverage for history overflow, browser/SSR lifecycle behavior, inspector cleanup, and router subscription disposal.

### Fixed
- Harden template expression rejection and ensure event/model directives use the correct root context.
- Preserve `ok-*` directive attributes and semantic HTML elements during sanitization.
- Upgrade the runtime `@rollup/plugin-terser` dependency to remove the vulnerable older transitive serializer.
- Remove committed `node_modules` artifacts and add repository ignore rules.

## [3.1.11] - 2026-08-15

### Added
- Complete the M5 project workflow with `onekit dev`, `onekit preview`, and `onekit test` in addition to `create` and `build`.
- Add `--cwd` support and argument passthrough for delegated project commands.
- Synchronize V3 usage, framework, getting-started, and production-readiness documentation with the 3.1.11 release.
- Add the experimental opt-in DevTools bridge for reactive effect/trigger and router navigation inspection.

### Fixed
- Validate preview prerequisites and preserve delegated child-process exit codes so CI failures are not hidden.
- Synchronize the exported `VERSION` constant with package version 3.1.11.

## [3.1.10] - 2026-08-15

### Added
- Add M4 SSR/Hydration hardening with request-scoped nested rendering, mismatch diagnostics, hydration listener disposal, and error/loading boundary primitives.
- Add regression coverage for SSR, hydration, boundaries, Node-safe imports, and runtime package behavior.

### Fixed
- Preserve the `onekit` CLI binary in published npm packages.
- Load the Rollup build implementation lazily so `onekit --help` works after a clean install.
- Move CLI build dependencies into runtime dependencies.
- Emit CLI CommonJS bundles with a `.cjs` extension for projects using `type: module`.
- Normalize npm package metadata and preserve the repository issue URL.

## [3.0.0] - 2024-12-XX

### Added
- **Modular Architecture**: Complete rewrite as ES modules with tree-shaking support
- **TypeScript Support**: Full TypeScript definitions and type safety
- **Multiple Build Formats**: UMD, ESM, and CommonJS builds with minification
- **Automated Testing**: Jest test suite with comprehensive coverage
- **Performance Benchmarks**: Built-in performance monitoring tools
- **Migration Guide**: Detailed guide for upgrading from v2.2.0
- **Enhanced Security**: Automatic XSS protection and input validation
- **Source Maps**: Included in all builds for better debugging
- **Tree Shaking**: Import only needed modules for smaller bundles

### Changed
- **Breaking**: Transformed from single IIFE file to ES modules
- **API Changes**:
  - `ok.store` → `ok.storage` (renamed for clarity)
  - `ok.wait` → `ok.utils.debounce` (moved to utils module)
  - `ok.flow` → `ok.utils.throttle` (moved to utils module)
  - `ok.plug` → `ok.plugin.register` (moved to plugin module)
- **Component System**: Updated to use `state` instead of `data` for consistency
- **Reactive State**: Enhanced with better type safety
- **Build System**: Migrated from manual builds to Rollup with TypeScript

### Removed
- **Deprecated Features**: Removed legacy APIs and unsupported features
- **Global Pollution**: No longer exposes global variables by default
- **Manual Security**: Automatic sanitization removes need for manual HTML escaping

### Fixed
- **TypeScript Errors**: Resolved all 64+ TypeScript compilation errors
- **Memory Leaks**: Improved cleanup and garbage collection
- **Security Vulnerabilities**: Automatic protection against XSS and prototype pollution
- **Performance Issues**: Optimized DOM operations and Virtual DOM diffing

### Security
- **Automatic XSS Protection**: All HTML insertion methods sanitize content
- **Input Validation**: Selectors, URLs, and user inputs are validated
- **Prototype Pollution Prevention**: Storage and reactive state protected
- **URL Sanitization**: Dangerous protocols blocked automatically

### Performance
- **Bundle Size**: Tree shaking reduces bundle size by up to 60%
- **Runtime Performance**: Optimized DOM operations and animations
- **Memory Usage**: Better cleanup and reduced memory leaks
- **Build Speed**: Faster compilation with TypeScript and Rollup

### Developer Experience
- **TypeScript IntelliSense**: Full type definitions for better IDE support
- **Source Maps**: Easier debugging in production
- **Comprehensive Tests**: Automated testing ensures reliability
- **Migration Documentation**: Clear upgrade path from v2.2.0

## [2.2.0] - 2024-XX-XX

### Security
- Added automatic HTML sanitization to prevent XSS attacks
- Implemented input validation for selectors and URLs
- Added prototype pollution prevention in storage and reactive state
- Enhanced URL sanitization to block dangerous protocols
- Improved component template security
- Added secure deep cloning with pollution protection
- Exposed security API via `ok.security`

### Improvements
- Better error handling and security warnings
- Enhanced storage operations with validation
- Improved API request security
- Router path sanitization

---

## Migration Notes

### From 2.2.0 to 3.0.0

This is a major version update with breaking changes. See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed migration instructions.

### Key Breaking Changes:
1. **Module System**: Must use ES imports instead of global `ok`
2. **API Changes**: Some method names and structures updated
3. **Security**: Now automatic, manual sanitization no longer needed
4. **TypeScript**: Full type safety may require code adjustments

### Compatibility:
- **Browsers**: Same support as 2.2.0 (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
- **Node.js**: Requires Node.js 14+ for development
- **Build Tools**: Compatible with modern bundlers (Webpack, Rollup, Vite, etc.)

---

## V3 Maintenance Pass — 2026-08-15

### Fixed
- Fixed the undefined `finalProps` reference in component creation.
- Corrected SSR streaming to pass a `WritableStreamDefaultWriter`.
- Removed the duplicate `defineStore` export and applied store plugins consistently.
- Converted the Jest configuration to `jest.config.cjs` for the ESM package.
- Exported store and SSR APIs from the package entrypoint.
- Corrected package declaration and subpath export targets to generated `dist/types` files.

### Added
- Added `docs/GETTING_STARTED.md`, a reactive counter example, and a store-backed todo example.

## Framework Expansion — 2026-08-15

### Added
- Added `nextTick`, `defineComponent`, and `unmount` ergonomic APIs.
- Added public template, JSX, web-component, and router exports.
- Added a working `onekit create` starter generator and `onekit build` TypeScript-aware bundler.
- Added CLI packaging metadata, Node.js engine requirements, subpath exports, and framework guide documentation.
- Added CLI regression coverage; the suite now covers ten passing tests.

### Improved
- Fixed CLI missing-dependency failures by using maintained Rollup plugins and Node.js built-ins.
- Improved delegated event typing and modern TypeScript build targets.

## Contributing

When contributing to OneKit, please:
1. Update the changelog with your changes
2. Follow the existing format
3. Add entries under the appropriate category (Added, Changed, Fixed, etc.)
4. Update version numbers according to semantic versioning

## Types of Changes
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` for vulnerability fixes

- Add typed lazy route component resolution, matched params/query context, and route-level scroll behavior callbacks.
- Harden `trapFocus` for empty containers and restore the previously focused element when released.
