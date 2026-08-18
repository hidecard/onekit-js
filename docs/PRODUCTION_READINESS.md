# OneKit JS V3 Production Readiness

## Executive position

OneKit JS V3 is a usable compact browser framework and a credible foundation for small-to-medium applications. It is **not yet feature-equivalent to React plus Next.js**, because those ecosystems include a mature renderer, routing conventions, server components or server data APIs, error and loading boundaries, an extensive package ecosystem, mature DevTools, and years of compatibility testing. OneKit can become production-usable without copying every React or Next.js feature, but it must first establish stable contracts around rendering, reactivity, routing, SSR, tooling, and releases.

> Production-ready means that the framework has explicit contracts, predictable failure behavior, repeatable builds, tested upgrade paths, and documented limits—not merely that a demo renders.

## Current status

| Area | Current state | Production assessment |
|---|---|---|
| Reactive state | Proxy-based `reactive`, `effect`, `computed`, `watch`, `batch`, and `nextTick` | Foundation is usable; deterministic tests now cover dependency cleanup, stoppable effects, computed chains, batching, array length/index changes, and deep array watch. Cleanup callbacks and a fully formal scheduler contract remain. |
| Components | Options-style components, templates, lifecycle hooks, mount/unmount | Suitable for demos and small apps; update diffing, event listener ownership, prop updates, and composition APIs need hardening. |
| VDOM/JSX | Basic VDOM and JSX helpers exist | Needs broader reconciliation, keyed lists, fragments, refs, controlled inputs, and hydration parity tests. |
| SSR | String rendering, streaming utilities, request-scoped context, hydration helpers, metadata helpers, progressive boundary chunks, and client continuation | M4 baseline complete: escaping, nested context propagation, metadata safety, hydration mismatch diagnostics, listener disposal, and boundary primitives are tested. Progressive boundaries now emit visible fallback/content chunks with import-safe client continuation, while streaming preserves original async render errors and supports AbortSignal cancellation; advanced async concurrency and adapter-level chunk scheduling remain future work. |
| Router | `Router` with dynamic params, query parsing, history/hash/memory modes, guards, nested layouts, lazy components, loaders, prefetch, scroll behavior, cancellation guards, route-level head metadata composition, and query-client integration | M2 browser/memory baseline is substantially covered; remaining work includes broader browser compatibility coverage, streamed SSR adapter integration, and framework-level route cache policies beyond the query-client contract. |
| Stores | Named stores and actions are available | Needs lifecycle, reset, subscriptions, dev inspection, persistence policy, and SSR request isolation. |
| CLI | `create`, `build`, `dev`, `preview`, and `test` commands work | Core workflow has acceptance coverage for delegated exit codes, cwd/argument passthrough, missing preview output, inline `--cwd=`/`--out-dir=` syntax, absolute output paths, custom Vite output forwarding, structured error codes, and actionable hints. Plugin hooks and richer diagnostics remain future work. |
| Backend | Fetch-compatible `createApi()`/`createServerApp()`, Node HTTP bridge, route methods, middleware, validation, DI context, safe responses, CORS, request IDs, authentication, authorization, bounded rate limiting, typed database adapter context, and session/token provider contracts | Beginner-friendly backend foundation is implemented and tested. `createNodeHandler()` covers Node HTTP; `app.handle(request)` remains the adapter-neutral serverless/edge contract. Database drivers, session/token verification, and identity storage remain application-owned; distributed rate-limit stores and decorator-based modules remain future work. |
| Package/release | TypeScript declarations, subpath exports, build checks, tests, and npm metadata exist | Release foundation is present; package export matrix, Node/browser compatibility, changelog discipline, and npm publish verification remain. |
| Documentation | V3 usage guide, framework guide, getting started guide, migration/release notes, and OneKit-only docs page exist | Strong baseline; progressive SSR boundaries, query persistence/revalidation, production caveats, and API stability labels are documented. |

## Highest-priority work before production adoption

### 1. Freeze the public contract

Every exported API needs a documented signature, return value, lifecycle rule, error behavior, and stability label. The project should distinguish stable APIs from experimental APIs such as streaming SSR, hydration, web components, and advanced plugin behavior. A compatibility test should import the package through the root entry point and every advertised subpath in both ESM and CommonJS contexts.

### 2. Harden reactivity

The reactive engine needs deterministic effect cleanup, a documented scheduler, stoppable watchers, cleanup callbacks, deep traversal rules, array mutation coverage, and protection against stale dependencies. The current V3 work adds proxy identity caching, dependency cleanup for reruns, an explicit `stop` helper, array length/index invalidation, and deep-watch coverage for array additions and nested mutations. Cleanup callbacks and a fully formal scheduler contract remain follow-up work.

### 3. Replace the minimal router with an application router

The V3 router now supports exact and dynamic paths, query strings, params, nested route composition, browser history, hash and memory modes, navigation guards, async loaders, cancellation, scroll behavior, prefetch, lazy components, route-level metadata composition, query-client integration, and a `createRouter` factory. The remaining framework-level work is broader browser compatibility coverage, adapter-level streamed route manifests, and application-specific cache policy. It is not a drop-in replacement for Next.js routing.

### 4. Establish SSR and hydration parity

**M4 baseline status:** SSR now preserves request-scoped context through nested elements and components, escapes text and attributes, safely renders metadata, and remains import-safe in Node. Hydration reports structural mismatches and returns a disposer for listeners without silently rewriting server DOM. Error and loading boundary primitives are available for render, loader, and SSR adapters.

Remaining SSR work includes advanced async concurrency, adapter-level stream scheduling, trusted application transport for loader state, and a larger browser compatibility matrix. Progressive fallback/content boundaries and client continuation are now covered, alongside deterministic Promise scheduling, original render failures, and AbortSignal cancellation.

### 5. Improve component rendering architecture

The current options-style component API is useful, but production applications need a consistent update model. The framework should choose and document whether component updates use VDOM reconciliation, template patching, or full subtree replacement. It should then add keyed list reconciliation, refs, slots with non-string content, event listener cleanup, prop update hooks, error boundaries, and unmount cleanup.

### 6. Make the CLI a complete project workflow

The CLI should provide `create`, `dev`, `build`, `preview`, and `test` commands with consistent exit codes and helpful diagnostics. Core failures now include stable error codes and hints for unknown commands, invalid options, invalid projects, and child-process startup failures. The starter should include TypeScript configuration, an application entrypoint, a production build, a test example, and a clear SSR option. CLI acceptance tests should run on Linux, macOS, and Windows path conventions where possible. The current suite covers inline option syntax and absolute output paths in addition to POSIX-style cwd and exit-code checks.

### 7. Establish the backend application layer

OneKit now has an adapter-neutral backend foundation plus an official lightweight Node HTTP bridge. The beginner path is `createApi()` with concise `context.ok()`, `context.json()`, `context.text()`, and `context.fail()` helpers. The lower-level `createServerApp()` API supports ordered middleware, decoded route params, query values, JSON validation, request state, the existing dependency injector, and an optional typed `context.database` adapter. `createNodeHandler()` connects the app to Node HTTP, while `app.handle(request)` remains suitable for serverless and edge adapters. Authentication/authorization contracts, `securityMiddleware.session()`/`token()` provider adapters, and bounded in-memory rate limiting are available. Database drivers, credential verification, identity/session storage, distributed rate-limit stores, and server-only secret handling remain application responsibilities.

### 8. Add production observability and failure boundaries

Applications need framework-level error capture for render errors, effect errors, event handler errors, router loader failures, and SSR failures. OneKit now exposes `createErrorReport`, `setErrorReporter`, and `errorHandler`; reporters receive a normalized `{ context, error: { name, message, stack? } }` payload, are opt-in, and are isolated so reporter failures cannot break application execution. When DevTools is enabled, failures also produce a `runtime:error` diagnostic event containing the normalized payload. The `onekit-error` DOM event remains available for browser integrations, while applications should avoid forwarding reports to external services unless they have reviewed and redacted their own messages and stacks.

### 9. Release safely

Before publishing a new release, the package should pass type-checking, all tests, production build, package dry-run, subpath import checks, and a clean-install smoke test from the generated tarball. A changelog entry, migration notes, and a versioned API stability matrix should accompany the release. The actual npm publish remains a user-authenticated step.

## Suggested implementation order

| Milestone | Deliverable | Exit criteria |
|---|---|---|
| M1 | Reactive contract and tests | Conditional effects, cleanup, watch stop, computed chains, batching, and arrays pass deterministic tests. |
| M2 | Router 1.0 | Factory API, dynamic params, history, guards, 404, and SSR matching are documented and tested. |
| M3 | Renderer 1.0 | Keyed reconciliation, fragments, event cleanup, refs, and component error handling are stable. |
| M4 | SSR 1.0 | Server/client parity suite, mismatch diagnostics, safe metadata handling, context isolation, hydration disposal, boundary primitives, and streaming error/abort semantics are implemented; async scheduling remains follow-up work. |
| M5 | CLI 1.0 | Create/dev/build/preview/test workflow works from a clean install and generated starter; child exit codes, `--cwd`, argument passthrough, inline options, and absolute output paths are implemented and covered. |
| M6 | Backend foundation | `createApi()`, route/middleware contracts, validation, DI context, safe defaults, `createNodeHandler()`, authentication/authorization contracts, session/token provider adapters, typed database adapter context, bounded rate limiting, and adapter-neutral `Request`/`Response` behavior are documented and tested. Distributed stores, concrete database integrations, identity storage, and decorator modules remain follow-up work. |
| M7 | Release 3.x | Package export matrix, changelog, migration guide, clean-install smoke test, and npm release verification are complete. |

## What OneKit should not promise yet

OneKit should not currently claim to be a drop-in React replacement, a Next.js replacement, or a complete NestJS/Express server platform. It should describe itself as a **compact TypeScript-first full-stack framework foundation with components, templates, JSX, stores, routing, SSR utilities, a beginner-friendly backend API, and a practical CLI**. That positioning is accurate and gives the project room to grow without creating compatibility expectations it cannot yet satisfy.

## Adoption recommendation

Teams can use the current release for documentation sites, interactive pages, internal tools, prototypes, and small browser-first applications after pinning the exact version and keeping an escape hatch to standard DOM APIs. For high-risk production applications, wait until async/streaming SSR semantics, the complete CLI workflow, renderer benchmarks, and clean-install release checks are complete.

## References

[1]: https://react.dev/reference/react React API Reference, React documentation.

[2]: https://nextjs.org/docs Next.js documentation, routing, rendering, and application architecture.

[3]: https://nodejs.org/api/packages.html Node.js package entry points and conditional exports documentation.
