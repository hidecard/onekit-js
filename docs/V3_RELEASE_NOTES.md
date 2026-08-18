# OneKit JS V3 Release Notes

**Release:** `onekit-js@3.1.19`  
**Starter CLI:** `create-onekit@1.0.8`  
**Branch:** `V3`  
**Release date:** 18 August 2026  
**License:** MIT

## Overview

OneKit JS `3.1.19` is a production-parity V3 patch release that extends the 3.1.18 foundation with progressive SSR boundaries, client continuation, persisted query state, and automatic focus/reconnect revalidation. The release remains compact and browser-first while providing clearer contracts for applications that need nested layouts, request-scoped data, typed route parameters, and controlled server/client boundaries.

This is a **compatible V3-line release**. Existing V3 applications can upgrade from earlier V3 versions by updating the package version and reviewing the migration notes below. Applications migrating from OneKit 2.x or the legacy global runtime should follow the full [Migration Guide](../MIGRATION_GUIDE.md), because the V3 module and lifecycle model contains broader changes.

> **Recommended upgrade:** update `onekit-js` to `3.1.19`, regenerate starters if needed, run the type-check and full test suite, then verify the packed package in a clean install.

## Highlights

| Area | What is included in `3.1.19` | Why it matters |
|---|---|---|
| Routing | JSON-safe manifests, file-based route discovery, typed path parameters, nested layout metadata, and typed loader contexts | Makes route trees easier to preload, compose, and maintain in TypeScript. |
| SSR and hydration | Structured hydration diagnostics and streaming error handoff | Makes mismatches and streaming failures observable without forcing an application-wide policy. |
| Data fetching | Query invalidation, mutations, retries, cancellation, optimistic updates, persistence-oriented lifecycle hooks, and route-loader integration | Provides a practical cache lifecycle while preserving uncached loader behavior by default. |
| Runtime boundaries | `isServerRuntime`, `isClientRuntime`, `serverOnly`, and `clientOnly` | Makes browser/server assumptions explicit and safer during SSR. |
| CLI starter | Updated Vite/React-inspired responsive starter with dark indigo/lavender visual language and quick-start guidance | Gives new projects a more useful production-like starting point. |
| Progressive SSR | Visible fallback shells, deferred content chunks, abort/error handoff, and import-safe client continuation | Allows useful HTML to arrive early while async boundaries continue on the client. |
| Query persistence | Configurable storage, cache key, max age, restore, focus/reconnect revalidation, and disposal | Preserves useful server data across reloads while keeping freshness explicit. |
| Documentation and validation | Synchronized V3 guide, production readiness guide, declarations, package verification, and release workflow | Reduces drift between source APIs and published artifacts. |

## New and expanded APIs

### Typed routing and loader contracts

The router now supports route-specific generic contracts for parameters, loader data, and application context. `RouteContext` carries the resolved location, matched records, and an optional application context. `RouteLoaderData<Loader>` extracts the awaited result of a loader, and `RouteContextFor<Path, AppContext>` provides an explicit context type for service-oriented applications.

```ts
import {
  createRouter,
  defineRoute,
  type RouteContextFor,
  type RouteLoaderData,
} from "onekit-js";

type Services = {
  api: { getUser(id: string): Promise<{ id: string; name: string }> };
};
declare const services: Services;

const loadUser = async ({ to, context }: RouteContextFor<"/users/:id", Services>) =>
  context.api.getUser(to.params.id);

type UserData = RouteLoaderData<typeof loadUser>;

const userRoute = defineRoute("/users/:id", { loader: loadUser });
const router = createRouter([userRoute], {
  mode: "memory",
  context: services,
});
```

`RouterOptions.context` is passed to `beforeEach`, `beforeEnter`, `loader`, `queryKey`, `handler`, and `afterEach`. The existing `MatchedRoute.data` field remains the leaf result, while `dataByRoute` preserves parent-to-leaf loader results.

### File-based routes and layout metadata

`createFileRoutes()` converts bundler module maps into ordinary `Route[]` values without accessing the filesystem at runtime. `RouteParamsFor<Path>` and `routeHref()` provide typed parameter and URL helpers. `defineLayoutRoute()` keeps a parent layout and its child route literals together for nested composition.

```ts
import {
  createFileRoutes,
  defineLayoutRoute,
  routeHref,
  type RouteParamsFor,
} from "onekit-js";

const params: RouteParamsFor<"/projects/:projectId"> = {
  projectId: "p-42",
};
const href = routeHref("/projects/:projectId", params);

const routes = createFileRoutes(import.meta.glob("/src/pages/**/*.{ts,tsx}", { eager: true }), {
  root: "/src/pages",
});

const dashboard = defineLayoutRoute("/dashboard", DashboardLayout, routes);
```

### SSR manifests and hydration diagnostics

`createRouteManifest(routes)` and `router.getManifest()` emit JSON-safe route metadata for preload planning and client hydration preparation. Function-valued loaders, guards, dynamic query keys, and component implementations are intentionally not serialized.

Hydration diagnostics can report mismatches through a callback and can be configured to throw when an application treats mismatches as deployment failures. Streaming renderers can hand errors to an `onError` callback so the server can record, format, or terminate the stream according to its policy.

### Query lifecycle

The V3 query client supports invalidation, mutations, retry policies, cancellation, optimistic updates, and typed dehydrate/hydrate handoff. Route loaders may use `queryKey`, `queryOptions`, and a router-level `queryClient`; routes without a query key continue to execute normally without implicit caching.

### Environment boundaries

Use `isServerRuntime()` and `isClientRuntime()` for conditional checks, and use `serverOnly()` or `clientOnly()` when a callback must fail clearly outside its intended runtime. These helpers are especially useful around browser globals, request-scoped SSR services, and hydration-only event setup.

## Compatibility and migration notes

The release does not intentionally remove public V3 APIs. The following behavior should nevertheless be reviewed during an upgrade:

| Existing code | Recommended `3.1.18` review |
|---|---|
| Router callbacks only use `to` and `from` | They may now read the optional `context` value from `RouterOptions.context`. |
| Route loaders return untyped values | Use `defineRoute()`, `RouteLoaderData`, or an explicit `RouteLoader<Params, Data, AppContext>` type where the result is consumed elsewhere. |
| Nested routes are represented manually | Consider `defineLayoutRoute()` and `dataByRoute` for parent-to-leaf composition. |
| SSR preload logic serializes route objects directly | Use `createRouteManifest()` and treat the result as an optimization hint, not an authorization source. |
| Query data is transferred between server and client manually | Use typed `dehydrate()` and `hydrate()` with request-scoped query clients. |
| Browser globals are accessed from shared modules | Guard them with runtime boundaries or move the access behind `clientOnly()`. |
| Starter projects use older generated UI | Regenerate with `create-onekit@1.0.8` or manually synchronize the starter dependency and entry files. |

## Upgrade procedure

First update both package identities that your project uses:

```bash
npm install onekit-js@3.1.18
# Only when using the standalone creator package:
npm install -D create-onekit@1.0.8
```

Then run the normal validation commands from the application root:

```bash
npm run type-check
npm test
npm run build
npm run verify:declarations
npm run verify:package
```

If the project was generated by an earlier CLI, compare its `package.json`, `src/main.ts` or `src/main.tsx`, `index.html`, and `vite.config.*` with a newly generated starter before copying application-specific code back. Do not overwrite application code blindly.

For SSR applications, verify that each request creates isolated query, router, and render state. Confirm that route manifests contain only JSON-safe data, that hydration diagnostics are connected in development or CI, and that streaming error handling does not leak request-specific data into a shared module.

## Validation status

The V3 branch release artifacts were validated with strict TypeScript compilation, the complete Jest suite, production library builds, declaration verification, clean package installation, and package entrypoint checks. The router typed-loader milestone added a regression test for application context propagation and was pushed to `origin/V3`.

## Known boundaries

OneKit’s router resolves navigation and data but does not automatically render route components. Applications must connect `MatchedRoute` values to their renderer. Route manifests are preload and hydration planning metadata; they are not an authorization mechanism. Query persistence and automatic focus/reconnect revalidation remain follow-up parity work rather than assumptions of this release.

## Related documentation

- [Migration Guide](../MIGRATION_GUIDE.md)
- [V3 Usage Guide](V3_USAGE.md)
- [Framework Guide](FRAMEWORK_GUIDE.md)
- [Production Readiness](PRODUCTION_READINESS.md)
- [Changelog](../CHANGELOG.md)
- [OneKit JS repository](https://github.com/hidecard/onekit-js)

## References

[1]: https://keepachangelog.com/en/1.0.0/ "Keep a Changelog"
[2]: https://semver.org/spec/v2.0.0.html "Semantic Versioning 2.0.0"
