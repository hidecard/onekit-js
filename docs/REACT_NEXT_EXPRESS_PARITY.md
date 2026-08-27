# OneKit JS V3 — React / Next.js / Express Parity Audit

**Audit date:** 2026-08-26  
**Repository:** [hidecard/onekit-js](https://github.com/hidecard/onekit-js)  
**Compared release baselines:** React 19.2, Next.js App Router 16.3.3 documentation, and Express 5.x documentation.

## Executive conclusion

OneKit JS is no longer a minimal renderer or router. It has a broad V3 foundation: reactive state, VDOM/JSX, components, hydration and SSR, router navigation and data loaders, QueryClient persistence, Fetch-compatible server APIs, middleware, typed errors, auth contracts, database adapter boundaries, CLI/build tooling, HMR, DevTools, and browser regression/performance checks.

It should **not** yet be described as a drop-in replacement for React + Next.js + Express. The main difference is integration depth. React and Next.js provide a cohesive server/client component and project-convention model, while Express provides a mature Node middleware ecosystem. OneKit currently provides compatible primitives and adapter boundaries, but applications still compose several of those primitives themselves.

## Evidence from official documentation

### React

React’s official Server Components documentation describes components that render ahead of time in an environment separate from the client app or SSR server. They can run at build time or per request, access a data layer during render, and pass data to Client Components. Server Components are not sent to the browser and cannot use interactive APIs such as `useState`; interactivity is composed through a client boundary. React also distinguishes the stable Server Components feature from the underlying bundler/framework APIs, which are not semver-stable across React 19.x minors [1].

**OneKit implication:** OneKit now has an opt-in Vite build validator for `"use client"`/`"use server"` directives that rejects client-to-server static imports. This is a compile-time safety boundary, not a Server Components runtime: OneKit still does not provide server-only rendering, a Flight-like transport, server-function serialization, or automatic client-boundary code splitting.

### Next.js

Next.js documents the App Router as a file-system-based router using Server Components, Suspense, and Server Functions. Its project model includes file conventions, layouts/pages, navigation prefetching, server/client components, data fetching and mutation, caching/revalidation, error handling, metadata, route handlers, proxy, and deployment guidance [2]. The data-fetching guide covers fetching in Server and Client Components and streaming components that depend on uncached data [3]. Route Handlers are defined in `route.js|ts` files inside `app`, use Web `Request`/`Response`, support the standard method set, return `405` for unsupported methods, and are not cached by default unless configured [4].

**OneKit implication:** OneKit already covers route matching, nested layouts, lazy routes, loaders, prefetch, metadata, manifests, SSR/hydration, an optional `createRouterView()`, and an opt-in Vite virtual route module that discovers pages, route groups, optional catch-all routes, layouts, and middleware metadata. The remaining gaps are automatic project wiring, generated fully typed route modules, runtime layout/middleware composition, prerender integration, integrated server/client component compilation, server functions/actions, streaming route payloads, and a unified cache/revalidation/deployment contract.

OneKit now also exposes explicit `head()` and `options()` server helpers, suppresses response bodies for `HEAD` requests, and returns `405` plus an `Allow` header when a known path receives an unsupported method. It intentionally does not synthesize an `OPTIONS` response for every route; applications can use the explicit helper or the built-in CORS preflight middleware.

### Express

Express 5 documents synchronous error capture and automatic forwarding of rejected or throwing Promise-returning route handlers and middleware to `next(value)`. Callback APIs still require explicit forwarding. Express also provides a default error handler at the end of the middleware stack, with custom error middleware available for application policy [5].

**OneKit implication:** OneKit has an adapter-neutral Fetch server, Express-style route methods, ordered middleware, typed errors, safe envelopes, CORS, request IDs, auth contracts, rate limiting, database boundaries, and a Node HTTP bridge. The remaining Express-adjacent gap is mostly ecosystem and migration breadth: mature third-party middleware compatibility, static/compression/upload/session adapters, observability integrations, and more deployment examples.

## Capability comparison

| Capability | OneKit JS current state | React 19.2 | Next.js App Router | Express 5.x | Assessment |
| --- | --- | --- | --- | --- | --- |
| Client components and VDOM | Implemented: VDOM, JSX, components, keyed reconciliation, refs, slots | Core rendering and component model | Uses React | Not provided | OneKit foundation is strong; ecosystem depth differs. |
| Reactive state | Implemented reactive/effect/computed/watch/batch APIs | Hooks and component state | React model plus framework conventions | Not applicable | OneKit has a separate explicit reactive model. |
| Routing | Custom Router with memory/hash/history, params, guards, loaders, nested layouts, prefetch, metadata, optional RouterView | External choice | Integrated file-system App Router | Middleware/router primitives | **P1 gap:** project convention and integrated route pipeline. |
| Server-side rendering | SSR string rendering, hydration diagnostics, streaming boundary primitives and adapter scheduling | React DOM/server and RSC ecosystem | Integrated SSR/RSC/streaming model | Not provided | **P0 gap:** cohesive server/client route transport. |
| Server/client component boundary | **Implemented safety baseline:** opt-in Vite directive detection and client-to-server static-import rejection; no runtime transport | Server Components and Client Components | Integrated App Router model | Not applicable | **P0 gap:** full compiler/module graph, server rendering, serialization, and client transport remain. |
| File-system routes | `createFileRoutes()` plus `createFileRouteManifest()` and an opt-in Vite virtual route module with index/page, dynamic, catch-all, optional catch-all, route groups, layouts, and middleware metadata | External/tooling choice | Core `app` convention | Not applicable | **P1 gap:** automatic project wiring, generated fully typed route modules, runtime middleware/layout composition, prerender integration, and stable deployment integration. |
| Data fetching | QueryClient, route loaders, deduplication, stale time, retries, persistence, IndexedDB, invalidation bridge | Application/framework choice | Integrated server/client fetching, caching, revalidation, streaming | Application-owned | **P1 gap:** unified framework cache/revalidation policy. |
| Server functions/actions | No stable framework-owned equivalent | React Server Functions boundary | App Router Server Functions/actions | Route handlers/application code | **P1 gap** for full-stack parity. |
| HTTP APIs | Fetch-compatible `createApi()`/`createServerApp()`, resources, middleware, CORS, auth, typed errors, standard GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS helpers, Node bridge | Not core | Route Handlers and framework APIs | Core strength | OneKit foundation is strong; middleware ecosystem remains smaller. |
| Error handling | Typed `ServerError`, safe redaction, error hooks, loading/error boundaries | Error boundaries | Route error conventions and boundaries | Default/custom middleware handlers | **P1 gap:** tighter SSR/client error integration and ecosystem adapters. |
| Persistence/database | SQLite/PostgreSQL/MySQL/MongoDB/Redis boundaries with injected drivers | External choice | External/framework integration | External middleware | Provider-neutral boundary is intentional; migrations/ORM/pools remain application-owned. |
| Deployment | CLI/build/Vite/HMR and adapter-neutral server contract | Toolchain-dependent | Integrated deployment/self-hosting guidance | Node-first | **P1 gap:** official deployment packages/examples and observability. |
| Testing/performance | Jest, Playwright, Chromium heap/performance, package/API/HMR gates | Large ecosystem | Framework testing guidance | Ecosystem tooling | **P1 gap:** required CI coverage for Firefox/WebKit/Edge. |
| Accessibility/metadata | Accessibility helpers and head/metadata APIs | External libraries/common patterns | Metadata conventions and optimizations | Not applicable | Maintain and expand examples. |
| Ecosystem | Growing OneKit-specific modules and CLI | Very large | Very large full-stack ecosystem | Very large middleware ecosystem | **P2 gap:** integrations, docs, migration tooling, and community packages. |

## Current implementation status

| Area | Status | What is still required |
| --- | --- | --- |
| Core runtime, VDOM, JSX, components | **Implemented baseline** | Component-owned effects, advanced async slot policies, and broader ecosystem integration. |
| Router and route rendering | **Implemented baseline** | Streamed SSR route integration, stable generated file routes, route-cache policy, and full cross-browser validation. |
| Query/data layer | **Implemented baseline** | Framework-level server/client cache/revalidation policy, conflict resolution, and broader focus/reconnect policy. |
| Server/API foundation | **Implemented baseline** | Third-party middleware adapters, production observability, deployment examples, and provider-specific packages. |
| Store lifecycle | **Implemented baseline** | Explicit `createStoreRegistry()` now supports per-request isolation; persistence policy and framework-managed SSR integration remain future work. |
| SSR and hydration | **Implemented/experimental mix** | Server/client component boundary, route payload reuse, high-concurrency streaming/back-pressure, and more browser coverage. |
| Tooling/release | **Implemented baseline** | CI browser matrix and next release publication after the current unreleased changes are reviewed. |

## Prioritized work plan

### P0 — Required for a credible full-stack production claim

OneKit should first establish a complete CI browser matrix with Firefox, WebKit, and Edge where supported, alongside Chromium. The current local validation covers Chromium; other engines require CI runners with their executables installed. The project should also define the SSR route payload contract: loader serialization, hydration reuse, abort/cancellation behavior, stale-navigation prevention, and stream error propagation.

If Next.js-like parity is a stated goal, the project must decide whether to implement a real server/client component compiler boundary. This is a large architectural project and should be an RFC before code. It should not be approximated with a few runtime flags, because module graph separation, transport, serialization, security, and bundler behavior are all part of the contract.

### P1 — High-value framework completeness

The next practical work should be a stable project-level file route convention and generated typed route metadata. The low-level helper now normalizes route groups and optional catch-all segments, but it is still bundler-provided rather than a full project plugin. This should be followed by a unified cache/revalidation API that connects QueryClient, route loaders, SSR preload, and client hydration. Server Functions/actions, stronger SSR/client error integration, production deployment adapters, and observability hooks should follow that contract.

Store persistence should be designed only after the request-isolation boundary is accepted. `createStoreRegistry()` now makes per-request maps possible, but a framework-managed SSR integration still needs lifecycle ownership, serialization policy, sensitive-data exclusion, and hydration rules.

### P2 — Ecosystem and adoption

OneKit should add official examples or companion adapters for static files, compression, multipart uploads, sessions, OpenTelemetry, structured logging, queues, deployment platforms, and common database migration workflows. These should remain optional packages so the browser core does not bundle provider clients. Migration guides from React/Next/Express should explain the intentional differences instead of promising drop-in compatibility.

## Recommendation

The project is suitable for **small-to-medium production applications that accept explicit composition and adapter ownership**. It is not yet equivalent to the integrated developer experience of Next.js or the breadth of the Express ecosystem. The best next milestone is not to copy every React or Next.js feature; it is to complete the SSR route data contract, cross-browser CI gate, file-route convention, and cache/revalidation model. Once those are stable, a decision can be made about whether a Server Component-style compiler is strategically worth its complexity.

## References

[1]: https://react.dev/reference/rsc/server-components "React — Server Components"
[2]: https://nextjs.org/docs/app "Next.js — App Router"
[3]: https://nextjs.org/docs/app/getting-started/fetching-data "Next.js — Fetching Data"
[4]: https://nextjs.org/docs/app/getting-started/route-handlers "Next.js — Route Handlers"
[5]: https://expressjs.com/en/5x/guide/error-handling.html "Express 5.x — Error Handling"
