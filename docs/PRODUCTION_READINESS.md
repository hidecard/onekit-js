# OneKit JS V3 Production Readiness

## Executive position

OneKit JS V3 is a usable compact browser framework and a credible foundation for small-to-medium applications. It is **not yet feature-equivalent to React plus Next.js**, because those ecosystems include a mature renderer, routing conventions, server components or server data APIs, error and loading boundaries, an extensive package ecosystem, mature DevTools, and years of compatibility testing. OneKit can become production-usable without copying every React or Next.js feature, but it must first establish stable contracts around rendering, reactivity, routing, SSR, tooling, and releases.

> Production-ready means that the framework has explicit contracts, predictable failure behavior, repeatable builds, tested upgrade paths, and documented limits—not merely that a demo renders.

## Current status

| Area | Current state | Production assessment |
|---|---|---|
| Reactive state | Proxy-based `reactive`, `effect`, `computed`, `watch`, `batch`, and `nextTick` | Foundation is usable; dependency cleanup, cancellation, deep watch semantics, and scheduler behavior need a formal contract. |
| Components | Options-style components, templates, lifecycle hooks, mount/unmount | Suitable for demos and small apps; update diffing, event listener ownership, prop updates, and composition APIs need hardening. |
| VDOM/JSX | Basic VDOM and JSX helpers exist | Needs broader reconciliation, keyed lists, fragments, refs, controlled inputs, and hydration parity tests. |
| SSR | String rendering, streaming utilities, request-scoped context, hydration helpers, metadata helpers | M4 baseline complete: escaping, nested context propagation, metadata safety, hydration mismatch diagnostics, listener disposal, and boundary primitives are tested. Streaming abort/error semantics and async scheduling remain future work. |
| Router | Minimal `Router` class with exact path lookup and handlers | Not yet comparable to a production router; needs route matching, params, history integration, guards, nested layouts, 404 handling, and SSR URL resolution. |
| Stores | Named stores and actions are available | Needs lifecycle, reset, subscriptions, dev inspection, persistence policy, and SSR request isolation. |
| CLI | `create` and `build` commands work | Needs dev command, inspectable configuration, framework templates, diagnostics, plugin hooks, and cross-platform acceptance tests. |
| Package/release | TypeScript declarations, subpath exports, build checks, tests, and npm metadata exist | Release foundation is present; package export matrix, Node/browser compatibility, changelog discipline, and npm publish verification remain. |
| Documentation | V3 usage guide, framework guide, getting started guide, and OneKit-only docs page exist | Strong baseline; production caveats and API stability labels should be made explicit. |

## Highest-priority work before production adoption

### 1. Freeze the public contract

Every exported API needs a documented signature, return value, lifecycle rule, error behavior, and stability label. The project should distinguish stable APIs from experimental APIs such as streaming SSR, hydration, web components, and advanced plugin behavior. A compatibility test should import the package through the root entry point and every advertised subpath in both ESM and CommonJS contexts.

### 2. Harden reactivity

The reactive engine needs deterministic effect cleanup, a documented scheduler, stoppable watchers, cleanup callbacks, deep traversal rules, array mutation coverage, and protection against stale dependencies. The current V3 work now adds proxy identity caching and dependency cleanup for reruns, plus an explicit `stop` helper. These changes must be followed by tests for conditional dependencies, nested objects, arrays, computed chains, batching, and stopped effects.

### 3. Replace the minimal router with an application router

A production router should support exact and dynamic paths, query strings, params, nested route composition, browser history, hash fallback, navigation guards, async loaders, cancellation, scroll restoration, 404 routes, and server-side URL matching. The API should expose a `createRouter` factory instead of relying on a single global router instance. This is one of the largest remaining gaps relative to application frameworks.

### 4. Establish SSR and hydration parity

**M4 baseline status:** SSR now preserves request-scoped context through nested elements and components, escapes text and attributes, safely renders metadata, and remains import-safe in Node. Hydration reports structural mismatches and returns a disposer for listeners without silently rewriting server DOM. Error and loading boundary primitives are available for render, loader, and SSR adapters.

Remaining SSR work includes async component scheduling, streaming abort/error semantics, serialized loader state, and a larger browser compatibility matrix.

### 5. Improve component rendering architecture

The current options-style component API is useful, but production applications need a consistent update model. The framework should choose and document whether component updates use VDOM reconciliation, template patching, or full subtree replacement. It should then add keyed list reconciliation, refs, slots with non-string content, event listener cleanup, prop update hooks, error boundaries, and unmount cleanup.

### 6. Make the CLI a complete project workflow

The CLI should provide `create`, `dev`, `build`, `preview`, and `test` commands with consistent exit codes and helpful diagnostics. The starter should include TypeScript configuration, an application entrypoint, a production build, a test example, and a clear SSR option. CLI acceptance tests should run on Linux, macOS, and Windows path conventions where possible.

### 7. Add production observability and failure boundaries

Applications need framework-level error capture for render errors, effect errors, event handler errors, router loader failures, and SSR failures. The framework should expose an error boundary or application error handler with development diagnostics and production-safe messages. Logging must be opt-in and must not leak secrets or user data.

### 8. Release safely

Before publishing a new release, the package should pass type-checking, all tests, production build, package dry-run, subpath import checks, and a clean-install smoke test from the generated tarball. A changelog entry, migration notes, and a versioned API stability matrix should accompany the release. The actual npm publish remains a user-authenticated step.

## Suggested implementation order

| Milestone | Deliverable | Exit criteria |
|---|---|---|
| M1 | Reactive contract and tests | Conditional effects, cleanup, watch stop, computed chains, batching, and arrays pass deterministic tests. |
| M2 | Router 1.0 | Factory API, dynamic params, history, guards, 404, and SSR matching are documented and tested. |
| M3 | Renderer 1.0 | Keyed reconciliation, fragments, event cleanup, refs, and component error handling are stable. |
| M4 | SSR 1.0 | Server/client parity suite, mismatch diagnostics, safe metadata handling, context isolation, hydration disposal, and boundary primitives are implemented; streaming error semantics remain follow-up work. |
| M5 | CLI 1.0 | Create/dev/build/preview/test workflow works from a clean install and generated starter. |
| M6 | Release 3.x | Package export matrix, changelog, migration guide, clean-install smoke test, and npm release verification are complete. |

## What OneKit should not promise yet

OneKit should not currently claim to be a drop-in React replacement, a Next.js replacement, or a full server application platform. It should describe itself as a **compact TypeScript-first reactive framework with components, templates, JSX, stores, routing, SSR utilities, and a practical CLI**. That positioning is accurate and gives the project room to grow without creating compatibility expectations it cannot yet satisfy.

## Adoption recommendation

Teams can use the current release for documentation sites, interactive pages, internal tools, prototypes, and small browser-first applications after pinning the exact version and keeping an escape hatch to standard DOM APIs. For high-risk production applications, wait until async/streaming SSR semantics, the complete CLI workflow, renderer benchmarks, and clean-install release checks are complete.

## References

[1]: https://react.dev/reference/react React API Reference, React documentation.

[2]: https://nextjs.org/docs Next.js documentation, routing, rendering, and application architecture.

[3]: https://nodejs.org/api/packages.html Node.js package entry points and conditional exports documentation.
