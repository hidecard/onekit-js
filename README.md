# OneKit JS

**OneKit JS V3** is a compact, TypeScript-first reactive framework for browser applications. It gives developers explicit building blocks for state, components, templates, JSX/VDOM, routing, stores, forms, data fetching, SSR/hydration, security, testing, and production tooling without forcing a large application architecture.

> **Current release:** `3.1.19`
> **Starter CLI:** `create-onekit@1.0.8`
> **License:** MIT
> **Runtime:** Browser-first JavaScript and TypeScript

OneKit is designed for developers who want a framework that is easy to learn but does not become restrictive as an application grows. You can begin with one reactive object and progressively adopt components, routes, stores, SSR, and typed tooling when the project needs them.

[![TypeScript-first](https://img.shields.io/badge/TypeScript-first-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Version](https://img.shields.io/badge/version-3.1.19-0f766e)](CHANGELOG.md)

## Documentation navigation

| Start here | Go deeper |
|---|---|
| [Quick start](#quick-start-in-five-minutes) | [Full V3 usage guide](docs/V3_USAGE.md) |
| [Mental model](#the-onekit-mental-model) | [Framework architecture](docs/FRAMEWORK_GUIDE.md) |
| [Feature map](#v3-feature-map) | [Production readiness](docs/PRODUCTION_READINESS.md) |
| [CLI reference](#cli-reference) | [Migration guide](MIGRATION_GUIDE.md) |
| [Contributing](#contributing-to-onekit) | [Release notes](docs/V3_RELEASE_NOTES.md) |

## Why developers choose OneKit

| Need | OneKit approach |
|---|---|
| Learn quickly | Small, explicit APIs with copy-ready examples and a built-in starter CLI. |
| Keep applications understandable | State, lifecycle, routing, data loading, and teardown have visible contracts. |
| Scale without a rewrite | Components, stores, typed routes, SSR, testing helpers, and Vite tooling are available when needed. |
| Ship safely | TypeScript declarations, security filtering, package verification, HMR checks, and regression tests are part of the repository workflow. |
| Contribute confidently | The source is modular, the validation commands are documented, and focused tests make changes reviewable. |

OneKit does not try to hide the browser. DOM elements, events, selectors, request lifecycles, and cleanup remain understandable. That makes the framework suitable for small products, internal tools, documentation sites, and larger component-based applications.

## V3 feature map

| Area | V3 capability | Recommended entrypoint |
|---|---|---|
| State | `reactive`, `computed`, `effect`, `watch`, batching, snapshots, cleanup | `onekit-js` |
| Components | Typed props, component lifecycle, registration, mount/unmount, dependency injection | `onekit-js` |
| Rendering | Templates, directives, JSX, automatic JSX runtime, VDOM patching, fragments | `onekit-js/jsx`, `onekit-js/jsx-runtime` |
| Routing | History/hash/memory modes, typed params, file discovery, nested layouts, guards, loaders, manifests, prefetch, scroll restoration | `onekit-js` and `onekit-js/router` |
| Backend | Fetch-compatible server app, route methods, middleware composition, params/query parsing, JSON responses, body validation, DI services, typed database adapter context, session/token provider contracts, authentication/authorization, portable rate-limit stores, CORS, request IDs, lifecycle hooks, and safe error responses | `onekit-js` |
| Server rendering | Request-scoped SSR, streaming, async rendering, hydration diagnostics, error/loading boundaries, safe route manifests | `onekit-js/ssr` |
| Data and forms | HTTP helpers, retry/timeout/cancellation, query invalidation, mutations, optimistic updates, SSR handoff, typed forms, validation | `onekit-js/api`, `onekit-js/query`, `onekit-js/forms` |
| Runtime boundaries | Explicit server/client detection and guarded callbacks for shared modules | `onekit-js` |
| Browser integration | Storage, accessibility helpers, animations, Web Components | `onekit-js/storage`, `onekit-js/a11y`, `onekit-js/web-components` |
| Tooling | Vite plugin, `.okjs` support, CLI, HMR checks, DOM-first testing helpers | `onekit-js/vite`, `onekit-js/testing` |
| Diagnostics | Opt-in inspectors, lifecycle events, bounded history, profiling measurements, normalized runtime errors, application reporters | `onekit-js` |

V3 keeps these capabilities composable. An application can use only the reactive core, or combine components, routes, stores, SSR, testing, and tooling as it grows.

### Latest production-parity additions

The current V3 branch also hardens failure handling and teardown behavior for production applications. `createErrorReport(error, context)` converts unknown failures into a normalized `{ context, error: { name, message, stack? } }` payload. Applications can register an optional reporter with `setErrorReporter(reporter)`; reporter failures are isolated and cannot interrupt the application. When the opt-in DevTools bridge is enabled, runtime failures appear as `runtime:error` events. The browser `onekit-error` event remains available for integrations, but applications should review and redact their own messages and stack traces before sending them to an external service.

VDOM subtree replacement now disposes registered event listeners in addition to clearing refs, including listeners on descendant nodes. This makes long-lived applications safer during keyed updates and subtree replacement. These behaviors are covered by the production test matrix.

Backend rate limiting now accepts a portable `RateLimitStore` contract through `securityMiddleware.rateLimit()` or the beginner-friendly `serverMiddleware.rateLimit()` alias. The default store is process-local memory; distributed deployments can provide a Redis, database, or edge-store adapter through `store.increment(key, windowMs)`.

### Verified V3.1.19 contract

The examples in this README are written against the published V3.1.19 package surface. The following table maps the main documented commands and entrypoints to the repository checks that verify them:

| Concern | Documented command or import | Verification source |
|---|---|---|
| TypeScript contract | `npm run type-check` | `tsconfig.json` and the full `src/` declaration graph |
| Production package | `npm run build` | `scripts/build-library.mjs` and `scripts/build-vite-plugin.mjs` |
| Package exports | `onekit-js`, `onekit-js/router`, `onekit-js/query`, `onekit-js/ssr` | `package.json#exports` and `scripts/verify-package.cjs` |
| CLI workflow | `onekit create`, `onekit dev`, `onekit build`, `onekit preview`, `onekit test` | `bin/onekit.js` and CLI tests |
| Runtime validation | `npm test -- --runInBand` | Jest configuration and repository test suites |
| Published declarations | `npm run verify:declarations` | `scripts/verify-declarations.mjs` |
| Clean package verification | `npm run verify:package` | Clean install, CLI smoke check, export verification, and vulnerability audit |

The latest V3 audit passes strict TypeScript checking, **30 Jest suites / 162 tests**, production build, declaration verification across 27 relative exports, clean package verification with zero reported vulnerabilities, and `git diff --check`. The Vite plugin build may print non-fatal externalization notices for `node:fs`, `node:path`, and `typescript`; these are expected tooling/server externals and do not indicate a failed build.

If an example is copied into an application, replace placeholder values such as `HomePage`, `loadReports`, and `createProject` with application-owned implementations. The framework APIs and signatures shown here are the verified part of each example.

## Quick start in five minutes

### Option A: create a new project

The current starter generator is version `1.0.8`:

```bash
npm create onekit@1.0.8 my-app
cd my-app
npm install
npm run dev
```

You can also use the standalone package name:

```bash
npx create-onekit@1.0.8 my-app
```

Create a JavaScript starter instead of TypeScript with either form:

```bash
onekit create my-app --javascript
# or
onekit create my-app --template js
```

### Option B: add OneKit to an existing Vite project

```bash
npm install onekit-js
```

A TypeScript declaration package is not required; OneKit ships its own declarations.

```ts
import { reactive, effect } from "onekit-js";

const state = reactive({ count: 0 });
const stop = effect(() => {
  const output = document.querySelector<HTMLSpanElement>("#count");
  if (output) output.textContent = String(state.count);
});

document.querySelector("#increment")?.addEventListener("click", () => {
  state.count += 1;
});

// Keep and call stop() when this feature is no longer needed.
void stop;
```

Example markup:

```html
<button id="increment" type="button">Increment</button>
<span id="count">0</span>
```

## The OneKit mental model

OneKit applications are built from four simple layers:

1. **State** contains reactive objects, derived values, stores, query state, and form state.
2. **View** is rendered with components, templates, JSX, or the low-level VDOM helpers.
3. **Composition** connects features with routes, plugins, dependency injection, SSR, and Web Components.
4. **Delivery** is handled through the CLI, Vite plugin, tests, package verification, and security checks.

A feature should own the resources it creates. Effects, watchers, subscriptions, timers, route loaders, and event listeners should be stopped or disposed when their component, scope, or route is no longer active.

## Project structure

A practical application can start with this layout:

```text
my-app/
├── index.html
├── package.json
├── vite.config.ts
├── src/
│   ├── main.ts
│   ├── app.ts
│   ├── components/
│   ├── routes/
│   ├── stores/
│   ├── services/
│   └── styles.css
└── tests/
```

Keep feature state close to the feature that owns it. Put reusable primitives in `components/`, application-wide state in `stores/`, network and persistence code in `services/`, and route-specific loading in `routes/`.

## Reactive state

### `reactive`, `effect`, `computed`, and `watch`

```ts
import { reactive, computed, effect, watch } from "onekit-js";

const cart = reactive({ price: 20, quantity: 2 });
const total = computed(() => cart.price * cart.quantity);

const stopEffect = effect(() => {
  console.log("total:", total.value);
});

const stopWatch = watch(
  () => cart.quantity,
  (next, previous) => console.log({ next, previous }),
  { immediate: true },
);

cart.quantity = 3;

// Call these when the owning feature is destroyed.
stopEffect();
stopWatch();
```

Effects clean up stale conditional dependencies before rerunning. Effects can also register per-run cleanup callbacks when an asynchronous operation or external resource belongs to that run.

### Batching and snapshots

```ts
import { batch, nextTick, snapshot } from "onekit-js";

batch(() => {
  cart.price = 25;
  cart.quantity = 4;
});

await nextTick();
const plainCart = snapshot(cart);
```

Use `batch` when several mutations should produce one flush. Use `nextTick` when work must run after the reactive microtask. Use `snapshot` before serializing or sending reactive data to code that should not retain proxy references.

## Components

A component may define props, local state, methods, a template or render function, and lifecycle hooks.

```ts
import {
  defineComponent,
  register,
  create,
  mount,
} from "onekit-js";

const Counter = defineComponent({
  name: "Counter",
  props: { step: { type: "number", default: 1 } },
  data: () => ({ count: 0 }),
  template: `
    <section>
      <strong>{{count}}</strong>
      <button data-on-increment type="button">Increment</button>
    </section>
  `,
  methods: {
    increment(this: any) {
      this.state.count += this.props.step;
      this.update();
    },
  },
});

register("Counter", Counter);
const instance = create("Counter", { step: 2 });
if (instance) mount(instance, "#app");
```

The public component lifecycle includes creation, mounting, updating, and destruction. Prefer explicit teardown for subscriptions and resources. `unmount`/`destroy` should be called when an instance is no longer needed. VDOM replacement also disposes event listeners and refs owned by the replaced subtree.

## Templates, JSX, and VDOM

Use templates when you want concise HTML-like markup and directives. Use JSX or render functions when you want JavaScript composition and stronger expression-level control.

```ts
import { h, render } from "onekit-js";

const view = h("main", { class: "panel" },
  h("h1", null, "Dashboard"),
  h("p", null, "Rendered with OneKit VDOM"),
);

render(view, document.querySelector("#app")!);
```

The JSX entrypoint is available through `onekit-js/jsx`, and `.okjs` single-file components are supported through the OneKit Vite plugin. Do not insert untrusted strings as HTML. Prefer text nodes, escaped interpolation, and validated data.

### Automatic JSX runtime

TypeScript projects using the automatic JSX transform can use the dedicated `onekit-js/jsx-runtime` subpath. The runtime provides `jsx`, `jsxs`, `jsxDEV`, and `Fragment` helpers, removes the JSX `children` field from DOM props, and preserves an optional JSX key in the generated VNode:

```tsx
/** @jsxImportSource onekit-js */
import { jsx, jsxs, Fragment } from "onekit-js/jsx-runtime";

export function Dashboard() {
  return jsxs("section", {
    className: "dashboard",
    children: [
      jsx("h1", { children: "Dashboard" }),
      jsx(Fragment, { children: [
        jsx("p", { children: "Rendered with the V3 runtime." }),
        jsx("button", { type: "button", children: "Continue" }),
      ] }),
    ],
  });
}
```

For classic JSX transforms, import `jsx`, `jsxDEV`, `h`, and `Fragment` from `onekit-js/jsx` or the root package. Use the automatic runtime when the compiler emits calls to `jsx` and `jsxs` directly.

## Routing and nested layouts

The router supports memory, browser, and hash navigation modes, dynamic parameters, query parsing, guards, async loaders, redirects, lazy components, prefetching, JSON-safe manifests, typed route contexts, and nested layout records. It resolves navigation and data; your application remains responsible for rendering the matched route.

```ts
import {
  createRouter,
  defineRoute,
  type RouteContextFor,
  type RouteLoaderData,
} from "onekit-js";

type Services = {
  api: { getProject(id: string): Promise<{ id: string; name: string }> };
};
declare const services: Services;

const loadProject = ({ to, context }: RouteContextFor<"/projects/:projectId", Services>) =>
  context.api.getProject(to.params.projectId);
type ProjectData = RouteLoaderData<typeof loadProject>;

const router = createRouter([
  defineRoute("/", { component: HomePage }),
  defineRoute("/projects/:projectId", {
    layout: ProjectLayout,
    loader: loadProject,
    children: [
      { path: "", component: ProjectOverview },
      { path: "/settings", component: ProjectSettings },
    ],
  }),
], {
  mode: "history",
  context: services,
});

await router.start();
await router.navigate("/projects/onekit/settings");
```

Use `RouteParamsFor<Path>` and `routeHref()` when constructing typed links, `createFileRoutes()` when discovering routes from a bundler module map, and `createRouteManifest()` or `router.getManifest()` for SSR preload and hydration planning. Keep route loaders and guards abortable. OneKit protects the application from stale asynchronous navigation committing after a newer navigation wins. Use `prefetch()` to warm route data without changing the current URL or committed route state.

## Backend and full-stack applications

OneKit V3 now includes a Fetch-compatible backend foundation for applications that want one framework for browser UI, SSR, APIs, and server-side composition. For the shortest learning path, use `createApi()` and return `context.ok()`, `context.json()`, or `context.fail()` directly from a route handler; the lower-level `createServerApp()` API remains available when you need custom options. It follows familiar Express-style route and middleware conventions while reusing OneKit's dependency-injection and TypeScript contracts. It is adapter-friendly: the same `ServerApp.handle(request)` method can be connected to serverless functions, edge runtimes, or other platforms that can provide a standard `Request` and consume a `Response`. For Node HTTP applications, `createNodeHandler(app)` bridges Node's `IncomingMessage`/`ServerResponse` shape without requiring Node imports in browser-oriented code; the application imports `node:http` only where the server is started.

```ts
import {
  createApi,
  validateBody,
  serverMiddleware,
} from "onekit-js";

const app = createApi();

app.use(serverMiddleware.requestId());

app.get("/api/health", async (context) =>
  context.ok({ ok: true, requestId: context.state.requestId }),
);

app.post(
  "/api/projects",
  validateBody((value) => {
    if (!value || typeof value !== "object" || typeof (value as { name?: unknown }).name !== "string") {
      throw new Error("name is required");
    }
    return value as { name: string };
  }),
  async (context) => context.json({ project: context.state.body }, { status: 201 }),
);

// Standard Fetch-compatible adapters call:
const response = await app.handle(request);

// Node HTTP adapter:
import { createServer } from "node:http";
import { createNodeHandler } from "onekit-js";
createServer(createNodeHandler(app)).listen(3000);
```

For startup and graceful shutdown, call `await app.start()` once after wiring routes and call `await app.stop()` from the server's shutdown path. `onStart` runs once per start cycle, `onStop` is awaited before the optional database adapter is closed, and concurrent stop calls are safely coalesced. This keeps the beginner path explicit without forcing a Node-specific server lifecycle into the browser-safe core.

```ts
const server = createServer(createNodeHandler(app));
await app.start();
server.listen(3000);

process.once("SIGTERM", async () => {
  await app.stop();
  server.close();
});
```

The server context exposes `request`, method/path, decoded `params`, `URLSearchParams` query values, per-request `state`, a scoped `DependencyInjector`, an optional typed `database` adapter, a one-read typed `body<T>()` helper, and concise response helpers: `ok(data)`, `json(data, init)`, `text(data, init)`, and `fail(message, status)`. Security helpers are intentionally explicit: `securityMiddleware.authenticate(resolveUser)` stores a verified application user in `state.user`, `securityMiddleware.session(provider)` and `securityMiddleware.token(provider)` adapt application-owned identity providers, `securityMiddleware.authorize(rule)` enforces a permission rule, and `securityMiddleware.rateLimit({ max, windowMs, key })` adds bounded in-memory limits and standard rate-limit headers. Use `app.get`, `app.post`, `app.put`, `app.patch`, `app.delete`, or `app.route` for endpoints; use `app.use` for cross-cutting middleware. `validateBody` parses JSON from a cloned request and turns validation failures into a `400` response. The built-in CORS middleware handles `OPTIONS` preflight requests with `204`, allows configurable methods/headers/credentials/max-age, and also applies CORS headers to `404` responses because global middleware runs before the fallback route. Unhandled route errors return a generic `500` response by default so internal messages are not leaked; provide `onError` to integrate application-owned logging and error reporting. For safe application failures, throw `createServerError(message, { status, code, details, headers })`; client-visible messages are exposed only for statuses below `500` unless `expose` is explicitly set. Use `errorResponse` when the application needs a final response envelope, and keep `onError` focused on telemetry because a failing error hook is isolated and cannot replace the safe fallback.

```ts
app.get(
  "/admin",
  securityMiddleware.authenticate(async ({ request }) => verifySession(request)),
  securityMiddleware.authorize((user) => user.role === "admin"),
  ({ ok, state }) => ok({ user: state.user }),
);

app.post(
  "/login",
  securityMiddleware.rateLimit({ max: 10, windowMs: 60_000, key: ({ request }) => request.headers.get("x-client-key") ?? "anonymous" }),
  loginHandler,
);
```

For CRUD-shaped APIs, `app.resource('/todos', { list, get, create, update, remove })` registers the conventional collection and `/:id` routes in one readable declaration. Use `context.body<T>()` when validation is already handled by a trusted boundary, or combine it with `validateBody()` when the input schema must be checked before the handler runs.

```ts
app.resource('/todos', {
  list: ({ database, ok }) => database
    ? database.query<Todo>('select * from todos').then((todos) => ok({ todos }))
    : ok({ todos: [] }),
  get: ({ params, database, ok, fail }) => database
    ? database.query<Todo>('select * from todos where id = ?', [params.id])
        .then(([todo]) => todo ? ok(todo) : fail('Todo not found', 404))
    : fail('Database is not configured', 503),
  create: async ({ body, ok }) => ok(await body<CreateTodo>()),
});
```

The CLI can generate the beginner-friendly full-stack shape without changing the default frontend-only starter:

```bash
onekit create my-app --full-stack --typescript
cd my-app
npm install
npm run dev                 # browser UI
npm run dev:server          # Fetch-compatible Node API on port 3001
npm start                   # production API process
```

The generated `server.mjs` exposes `GET /api/health`, includes graceful shutdown, and is intentionally small enough to replace with application routes, database adapters, authentication providers, and deployment-specific adapters. The `.env.example` file documents the `PORT` setting. Run the UI and API as separate processes during development, or place them behind the same deployment gateway in production.

This backend layer is intentionally additive and does not replace the existing client router, SSR helpers, QueryClient, or component APIs. It now includes a small Node HTTP bridge, explicit security middleware contracts, and typed adapter contracts for database access and identity providers, but remains a foundation rather than a promise of full NestJS decorators, a built-in ORM, managed sessions, or a distributed persistence layer. Applications must verify tokens or sessions with their own trusted server-only logic, implement provider-specific credential handling, use a distributed rate-limit store when running multiple instances, and keep secrets out of client bundles. Applications should keep database drivers, authentication, authorization, and secrets in server-only modules and choose the adapter appropriate to their deployment target.

## Stores, query data, and forms

### Stores

Use stores for shared application state with explicit actions and subscriptions. Keep server data separate from local UI state when that separation makes invalidation and loading behavior clearer.

### Query client

`onekit-js/query` provides a compact query foundation with deduplication, stale-time behavior, invalidation, retries, cancellation, mutations, optimistic updates, and SSR dehydrate/hydrate handoff:

```ts
import { QueryClient } from "onekit-js/query";

const queries = new QueryClient({ staleTime: 30_000 });
const result = await queries.fetch(["projects"], () =>
  fetch("/api/projects").then((response) => response.json()),
);

queries.invalidate(["projects"]);
declare function createProject(input: { name: string }): Promise<{ id: string; name: string }>;
const mutation = await queries.mutate(
  { name: "New project" },
  {
    mutationFn: (input) => createProject(input),
    optimistic: {
      key: ["projects"],
      update: (current, input) => [...((current as Array<{ name: string }>) ?? []), input],
    },
  },
);
```

Use stable query keys. Do not create a fresh object or array as a query input on every render unless the client intentionally treats it as a new request.

### Route loading and boundaries

Router loaders can share the QueryClient cache and optionally report pending work through a `LoadingBoundary`. Pair it with an `ErrorBoundary` when the route needs a controlled fallback instead of a rejected navigation:

```ts
import { createErrorBoundary, createLoadingBoundary } from "onekit-js";
import { createRouter } from "onekit-js/router";

const loading = createLoadingBoundary<unknown>();
const errors = createErrorBoundary({
  fallback: (error, reset) => ({
    kind: "error",
    message: error instanceof Error ? error.message : String(error),
    reset,
  }),
});

const router = createRouter([
  {
    path: "/reports",
    loader: () => loadReports(),
    queryKey: ["reports"],
    queryOptions: { staleTime: 30_000 },
  },
], {
  queryClient: queries,
  loadingBoundary: loading,
  errorBoundary: errors,
});

const navigation = router.navigate("/reports");
// Render loading.render(loadingView, readyView) while the route loader is pending.
await navigation;
```

The loading boundary tracks the latest route-loader attempt and ignores stale completion state. A route with no `queryKey` keeps the normal uncached loader behavior. Query-backed loaders use the same deduplication and freshness rules as direct `QueryClient.fetch()` calls, so prefetched or hydrated data can be reused during navigation.

### Typed forms

```ts
import { createForm } from "onekit-js/forms";

const form = createForm(
  { email: "", password: "" },
  async (values) => ({
    email: values.email.includes("@") ? undefined : "Enter a valid email",
    password: values.password.length >= 8 ? undefined : "Use at least 8 characters",
  }),
);

form.setValue("email", "developer@example.com");
const submitted = await form.submit();
```

Validate at the boundary, show field-level errors, and do not treat client-side validation as a replacement for server-side validation.

## HTTP, storage, accessibility, and animation

The root package exposes HTTP helpers such as `request`, `get`, `post`, `put`, and `del`, storage helpers, accessibility utilities, and animation primitives. Network code should handle timeout, cancellation, retry policy, non-2xx responses, and user-visible error states explicitly.

For persistent data, handle corrupted records defensively and avoid storing secrets in browser storage. For accessibility, provide labels, keyboard paths, visible focus, meaningful headings, and appropriate button types. For animation, respect `prefers-reduced-motion` and never make essential information available only through motion.

## SSR and hydration

OneKit supports server rendering, streaming, async rendering, hydration, and request-scoped rendering contracts. Keep request data isolated per request, escape untrusted text, and ensure the server and client produce the same meaningful attributes, boolean properties, styles, fragments, and component structure.

A production SSR checklist should include:

- No request-specific state stored in module-level mutable variables.
- Abort and timeout handling for async loaders.
- Consistent serialization of data passed to the client.
- Hydration tests for attributes, events, booleans, styles, fragments, and nested components.
- Error boundaries that preserve the original error and do not allow stale async work to overwrite a newer result.

For server-to-client data handoff, create one `QueryClient` per SSR request, await the route queries, call `dehydrate()`, transport the resulting snapshot through your trusted escaped serialization layer, and call `hydrate()` on a fresh browser client before mounting the app. Only settled success/error states are exported; pending promises are never serialized and hydration does not run loaders.

```ts
// server request
import { createQueryClient } from "onekit-js/query";
import { createRouter } from "onekit-js/router";

declare function loadDashboard(context?: { signal: AbortSignal }): Promise<{ total: number }>;
const serverQueries = createQueryClient();
await serverQueries.fetch(['dashboard', 'summary'], loadDashboard);
const payload = JSON.stringify(serverQueries.dehydrate());

// browser bootstrap
const clientQueries = createQueryClient();
clientQueries.hydrate(JSON.parse(payload));
```

With a router, give data-owning routes a stable `queryKey` and pass the same client to the router. The loader is then deduplicated and can reuse hydrated data on the client; set `queryOptions.staleTime` according to the freshness policy of that resource.

```ts
const queries = createQueryClient();
const router = createRouter([
  {
    path: '/dashboard',
    queryKey: ['dashboard', 'summary'],
    queryOptions: { staleTime: 30_000 },
    loader: () => loadDashboard(),
  },
], { mode: 'memory', queryClient: queries });
```

Use `isServerRuntime()` and `isClientRuntime()` for explicit checks. Wrap browser-only or server-only callbacks with `clientOnly()` and `serverOnly()` when an incorrect runtime should fail clearly instead of being silently skipped:

```ts
import { clientOnly, isServerRuntime, serverOnly } from "onekit-js";

const readViewport = clientOnly(() => window.innerWidth);
const getRequestId = serverOnly(() => "request-scoped-value");
void getRequestId;

if (isServerRuntime()) {
  console.log("Rendering on the server");
}
```

See the [V3 Usage Guide](docs/V3_USAGE.md), [Migration Guide](MIGRATION_GUIDE.md), and [V3 Release Notes](docs/V3_RELEASE_NOTES.md) for streaming examples, typed loader contracts, and advanced SSR guidance.

## Metadata, SEO, and document head

V3 includes a small **SSR-safe head manager** for the application-shell responsibilities commonly handled by framework metadata APIs. It supports titles, descriptions, keywords, robots directives, canonical URLs, Open Graph fields, and Twitter card fields without requiring a browser during server rendering.

```ts
import { createHeadManager, renderHead } from "onekit-js/head";

const metadata = {
  title: "Dashboard",
  description: "OneKit application dashboard",
  canonical: "https://example.com/dashboard",
  openGraph: { title: "Dashboard", type: "website" },
  twitter: { card: "summary" },
};

// In an SSR adapter, put this into the document <head>.
const headHtml = renderHead(metadata);

// In the browser, only nodes owned by this manager are replaced.
const head = createHeadManager(metadata);
head.mount(document);
head.update({ title: "Dashboard — Reports" });
// Call head.dispose() when the application shell is destroyed.
```

`renderHead()` escapes metadata values before generating HTML. `createHeadManager()` preserves application-owned `<head>` nodes, replaces its own nodes atomically, supports `clear()` and `dispose()`, and can be used with route loaders or router `afterEach` hooks. The public subpath is `onekit-js/head`; all of the same helpers are also available from the root entrypoint.

## DevTools and profiling

DevTools are **opt-in** and disabled by default. Enable them only in development or in a controlled diagnostics build. The bridge is safe to import in SSR code because browser-global installation occurs only when a browser `window` exists:

```ts
import { enableDevTools, measureDevTools } from "onekit-js";

const bridge = enableDevTools({
  historySize: 100,
  installGlobal: false,
});

const unsubscribe = bridge.subscribe((event) => {
  if (event.type === "router:navigation") {
    console.debug(event.phase, event.to);
  }
  if (event.type === "performance:measure") {
    console.debug(event.name, `${event.duration.toFixed(1)}ms`, event.status);
  }
});

const result = bridge.measure("load-dashboard", () => loadDashboard());
const standalone = await measureDevTools("fetch-projects", async () => fetchProjects());

// Feature teardown:
unsubscribe();
bridge.dispose();
```

The bridge exposes bounded history through `getHistory()`, metadata through `getMetadata()`, inspectors through `getInspectors()`, and resource/dependency graphs through `getResourceGraph()` and `getDependencyGraph()`. `measureDevTools()` and `bridge.measure()` preserve the task result, record a non-negative duration, emit `performance:measure`, and rethrow task errors after recording an `error` measurement. Avoid enabling diagnostics where event payloads could expose private application data.

## Security rules for application developers

OneKit includes filtering and regression coverage for common renderer and SSR attack surfaces, but application code must still treat external data as untrusted.

| Risk | Safe practice |
|---|---|
| XSS | Render untrusted values as text; sanitize HTML with a trusted policy before using an HTML sink. |
| Unsafe URLs | Allow only the protocols and origins your application needs; reject dangerous schemes. |
| Event injection | Never turn user-provided strings into event handler code. |
| CSS injection | Validate style values and avoid interpolating untrusted CSS declarations. |
| Prototype pollution | Use guarded object merges and reject attacker-controlled prototype keys. |
| SSR leakage | Keep secrets and request-specific values on the server; serialize only safe data. |
| Supply-chain risk | Pin and audit dependencies, review lockfile changes, and run package verification before release. |

Security hardening in the framework reduces risk; it does not make unsafe application input safe automatically.

## Testing and production verification

Run the repository validation matrix before opening a pull request:

```bash
npm install
npm run type-check
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npm test -- --runInBand
npm run build
npm run verify:declarations
npm run verify:package
npm run verify:hmr
git diff --check
npm audit --audit-level=moderate
```

The test suite covers reactivity, components, VDOM, SSR/hydration, router behavior, query/forms, security boundaries, CLI behavior, HMR, and developer ergonomics. Add a focused regression test whenever a change fixes a bug or changes a public contract.

For application tests, `onekit-js/testing` provides DOM-first helpers such as `renderTest`, `cleanup`, `fireEvent`, `flush`, and `waitFor`.

## CLI reference

The `onekit` CLI supports the following workflow from the generated project directory:

```bash
onekit create my-app --typescript
cd my-app
npm install
onekit dev
onekit build
onekit preview
onekit test
onekit help
```

For a Vite-style application generated by `onekit create`, `onekit build` delegates to the project’s `build` script (`vite build`) because the starter entrypoint is `src/main.ts` or `src/main.js`, not a library entrypoint. For a library project with `src/index.ts`, `src/index.js`, or a `package.json` `source` field, it uses OneKit’s bundle builder.

Use a different project directory or forward tool arguments with:

```bash
onekit dev --cwd ./my-app -- --host 0.0.0.0
onekit preview --cwd ./my-app -- --port 4173
onekit test --cwd ./my-app -- --watch
```

CLI diagnostics include stable categories such as `UNKNOWN_COMMAND`, `INVALID_OPTION`, `INVALID_PROJECT`, `COMMAND_FAILED`, and `CLI_ERROR`. The error message includes a next-step hint so CI and local development can identify whether the problem is argument parsing, project configuration, or a delegated command.

## Public package entrypoints

Prefer the root entrypoint for the stable public API. Feature subpaths are available when an application or tool needs them directly:

```ts
import { reactive } from "onekit-js";
import { createRouter } from "onekit-js/router";
import { QueryClient } from "onekit-js/query";
import { createForm } from "onekit-js/forms";
import { createHeadManager, renderHead } from "onekit-js/head";
import { renderTest, waitFor } from "onekit-js/testing";
import { oneKitVitePlugin } from "onekit-js/vite";
```

The package also exposes `core`, `components`, `ssr`, `head`, `template`, `jsx`, `jsx-runtime`, `animation`, `api`, `a11y`, `storage`, `ergonomics`, `web-components`, `okjs`, `router`, `query`, `forms`, `testing`, and `vite` feature paths. Use only documented public exports; do not import internal files from `src/`.

A feature subpath normally shares the main browser bundle while exposing a focused declaration entrypoint. The `vite` subpath is the exception: it exposes the Vite plugin build and should be used only from Vite configuration files.

## Troubleshooting

| Symptom | First checks |
|---|---|
| TypeScript cannot find a declaration | Run `npm run build`, then `npm run verify:declarations`; restart the editor TypeScript server. |
| CLI says `INVALID_PROJECT` | Confirm the target directory and required `package.json` scripts. |
| Preview does not start | Run a production build first and confirm that `dist/` exists. |
| Automatic JSX import fails | Install `onekit-js`, use `onekit-js/jsx-runtime` for the automatic transform, and confirm that the package declarations have been generated. |
| DevTools has no events | Call `enableDevTools()` before creating the reactive/router work you want to inspect; it is disabled by default. |
| Profiling does not finish | Await `bridge.measure()` or `measureDevTools()` when the task returns a Promise; errors are rethrown after the error event is recorded. |
| State appears not to update | Confirm the read occurs inside an effect/computed/watch and that the reactive object was not replaced with a plain clone. |
| A route shows stale data | Abort or invalidate loaders and ensure the latest navigation owns the result. |
| Hydration differs | Compare server/client attributes, whitespace, boolean values, styles, fragments, and conditional output. |
| A test hangs | Dispose effects, watchers, timers, event listeners, and query subscriptions in teardown. |

When reporting a bug, include the smallest reproduction, Node version, package version, command used, expected behavior, actual behavior, and the first relevant stack trace.

## Contributing to OneKit

OneKit is open to developers who want to improve the framework, documentation, examples, tests, tooling, or developer experience. A small documentation correction is a valuable contribution, and a focused issue reproduction is often more useful than a large speculative change.

### 1. Find or create an issue

Before implementing a substantial change, search the [GitHub issues](https://github.com/hidecard/onekit-js/issues). For a new bug, include a minimal reproduction. For a feature, explain the user problem, proposed API, compatibility impact, and why the behavior belongs in the framework rather than in application code.

### 2. Set up the repository

```bash
git clone https://github.com/hidecard/onekit-js.git
cd onekit-js
git checkout -b fix/short-description
npm install
npm run type-check
npm test -- --runInBand
```

The active development line for this work is `V3`. Keep changes focused and do not commit generated `node_modules` content.

### 3. Make a focused change

Follow the existing TypeScript style and preserve public API compatibility unless the change is explicitly a breaking release. Add or update tests beside the behavior you changed. Keep security-sensitive changes narrow, explain the threat model, and avoid weakening existing sanitization or prototype-pollution guards.

When adding a public API, update the implementation, declarations/build output, tests, README or V3 guide, changelog, and package verification coverage together. Do not rely on a local build artifact that is absent from a clean checkout.

### 4. Run the checks

```bash
npm run type-check
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npm test -- --runInBand
npm run build
npm run verify:declarations
npm run verify:package
npm run verify:hmr
git diff --check
```

If a check fails, fix the underlying issue rather than hiding the failure or weakening the test. Build warnings should be understood and documented, even when they are non-blocking.

### 5. Open a pull request

Push the branch and open a pull request against `V3`. A useful pull request description contains the problem, the design decision, files changed, tests run, security considerations, compatibility notes, and any follow-up work. Reviewers should be able to understand the change without reconstructing the entire conversation.

## Documentation map

| Resource | Use it for |
|---|---|
| [V3 Usage Guide](docs/V3_USAGE.md) | Full API signatures and advanced examples. |
| [Getting Started](docs/GETTING_STARTED.md) | A short first-project walkthrough. |
| [Framework Guide](docs/FRAMEWORK_GUIDE.md) | Architecture and application conventions. |
| [Migration Guide](MIGRATION_GUIDE.md) | Moving from older OneKit versions and comparing patterns. |
| [Production Readiness](docs/PRODUCTION_READINESS.md) | Runtime contracts, security guarantees, and release guidance. |
| [Release notes](docs/V3_RELEASE_NOTES.md) | Human-readable `3.1.19` upgrade summary and compatibility notes. |
| [Changelog](CHANGELOG.md) | Version history and release notes. |
| [Issue tracker](https://github.com/hidecard/onekit-js/issues) | Bugs, feature proposals, and questions. |
| [GitHub repository](https://github.com/hidecard/onekit-js) | Source, tests, examples, and pull requests. |

## Versioning and release notes

The current framework release is **OneKit JS `3.1.19`**. The current starter CLI release documented here is **`create-onekit@1.0.8`**. The framework package and starter CLI may release independently; always check the command and package name when pinning versions. For upgrade steps and compatibility notes, read the [V3 Migration Guide](MIGRATION_GUIDE.md) and [V3.1.19 Release Notes](docs/V3_RELEASE_NOTES.md).

OneKit follows semantic versioning. Additive APIs and fixes should remain compatible within a major version. Breaking changes require migration notes, updated examples, regression coverage, and an explicit changelog entry.

## License

OneKit JS is released under the [MIT License](LICENSE). Contributions are welcome under the same terms.
