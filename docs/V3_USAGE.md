# OneKit JS V3 Usage Guide

**Target release:** OneKit JS V3 / 3.1.19
**License:** MIT  
**Runtime:** Browser-first JavaScript and TypeScript

OneKit is a compact reactive JavaScript framework for building component-based browser applications without requiring a large runtime or a prescribed application architecture. The V3 package exposes reactive state, components, templates, JSX helpers, routing, stores, SSR utilities, HTTP helpers, storage, accessibility utilities, security helpers, plugins, dependency injection, animations, and Web Components from one tree-shakeable entry point.

> The examples in this guide use the public package entry point. They are intentionally small and can be copied into a Vite or OneKit CLI project.

## 1. Installation

Install the package in an existing project:

```bash
npm install onekit-js
```

For a TypeScript project, no separate type package is required because the package ships its declarations. Import only the features used by the application:

```ts
import { reactive, effect, defineComponent, mount } from "onekit-js";
```

The package also exposes subpath metadata for feature-oriented imports. Prefer the root import for the most stable public API unless a build system specifically requires a subpath.

## 2. Create a project with the CLI

The CLI is included in the package and provides a zero-configuration starter and a production build command.

```bash
npm create onekit@latest my-app
# or: npx --yes --package=onekit-js onekit create my-app
# or: npx create-onekit my-app
cd my-app
npm install
npm run dev
```

Create accepts relative or absolute target paths. The generated project contains a Vite entrypoint, TypeScript source, `vite.config.ts`, and a starter component. Build the application with:

```bash
onekit build
onekit dev
onekit preview
onekit test
```

The create command generates a Vite-compatible TypeScript starter by default. Use `--javascript` or `--template js` for a JavaScript starter. For a generated Vite project, `onekit build` delegates to the project `build` script because the starter entrypoint is `src/main.ts` or `src/main.js`; a custom `--out-dir <directory>` is forwarded as Vite's `--outDir` option. For a library project with `source`, `src/index.ts`, or `src/index.js`, it uses OneKit's bundle builder. `onekit dev` delegates to the project `dev` script, `onekit preview` requires a `dist` directory and delegates to the `preview` script, and `onekit test` delegates to the project `test` script while preserving the child process exit code. Use `--cwd <directory>` to run commands from another project and pass additional arguments after the command.

```bash
onekit dev --cwd ./my-app -- --host 0.0.0.0
onekit preview --cwd ./my-app -- --port 4173
onekit test --cwd ./my-app -- --watch
```

Use `onekit help` or `onekit --help` after a global install, or `npx --yes --package=onekit-js onekit help` without a global install.

### CLI diagnostics and error codes

OneKit reports command failures to stderr using a stable code and an actionable hint:

```text
OneKit CLI error: [ERROR_CODE] Human-readable explanation.
Hint: The next action to take.
```

| Code | When it is emitted | What to do |
|---|---|---|
| `UNKNOWN_COMMAND` | The command name is not recognized. | Run `onekit help` and select a supported command. |
| `INVALID_OPTION` | `--cwd` or `--out-dir` has no value, including a missing inline value. | Use `--cwd <directory>`/`--out-dir <directory>` or `--cwd=<directory>`/`--out-dir=<directory>`. |
| `INVALID_PROJECT` | The project directory, `package.json`, or command-specific script is invalid or missing. | Verify the directory and JSON, then add the required `dev`, `preview`, or `test` script. |
| `COMMAND_FAILED` | OneKit cannot start the delegated command. | Check npm and the project dependencies are installed and available on `PATH`. |
| `CLI_ERROR` | An error does not match a more specific category. | Follow the message and hint, then rerun the corrected command. |

OneKit preserves a delegated child command's non-zero exit code. Preview validates the build output before starting the preview script. Both separated and inline option forms work across POSIX and Windows shells:

```bash
onekit preview --cwd ./my-app --out-dir ./my-app/dist -- --port 4173
onekit preview --cwd=C:\\work\\my-app --out-dir=C:\\work\\my-app\\dist -- --port 4173
```

When troubleshooting, read the bracketed code first. `INVALID_OPTION` indicates argument parsing; `INVALID_PROJECT` indicates the target project; and `COMMAND_FAILED` indicates that the delegated process could not start. A delegated `test` process that runs and exits non-zero is intentionally returned unchanged so CI receives the original failure status.

## 3. Reactive state

### `reactive`

`reactive` wraps an object in a Proxy and tracks reads made by effects. Nested objects are wrapped when accessed, and repeated access to the same nested object preserves proxy identity. Effects clean up stale conditional dependencies before each rerun.

```ts
import { reactive, effect } from "onekit-js";

const state = reactive({ count: 0, label: "Clicks" });

const stop = effect(() => {
  const output = document.querySelector("#output");
  if (output) output.textContent = `${state.label}: ${state.count}`;
});

state.count += 1;
// The effect runs again and updates #output.

// Keep the returned function when an application needs an explicit effect handle.
void stop;
```

### `computed`

`computed` creates a lazy value with a `.value` property. It recalculates after a dependency changes.

```ts
import { reactive, computed, effect } from "onekit-js";

const cart = reactive({ price: 20, quantity: 2 });
const total = computed(() => cart.price * cart.quantity);

effect(() => console.log(total.value));
cart.quantity = 3;
```

### `watch`

`watch` observes a property name, a getter, or an object. The callback receives the new and previous values. Object sources are deeply traversed by default; use `deep: false` for shallow behavior. The returned disposer stops dependency tracking. `stop(runner)` explicitly stops an effect.

```ts
const stop = watch(
  () => state.count,
  (next, previous) => console.log({ next, previous }),
  { immediate: true }
);

stop();
```

### `batch`, `nextTick`, `snapshot`, and `bind`

Use `batch` when multiple mutations should flush together. Use `nextTick` to run work in the next microtask after state changes. `snapshot` returns a safe deep clone, and `bind` connects a DOM property to reactive state.

```ts
batch(() => {
  state.count = 10;
  state.label = "Updated";
});

await nextTick();
const plainState = snapshot(state);

bind("#name", state, "label", "value");
```

## 4. Components

### Define, register, create, and mount

A component definition can declare props, local state, a template or render function, methods, dependency injection, and lifecycle hooks.

```ts
import {
  defineComponent,
  register,
  create,
  mount,
  unmount,
} from "onekit-js";

const Counter = defineComponent({
  name: "Counter",
  props: {
    step: { type: "number", default: 1 },
  },
  data: () => ({ count: 0 }),
  template: `
    <section>
      <strong>{{count}}</strong>
      <button data-on-increment>Increment</button>
    </section>
  `,
  methods: {
    increment(this: any) {
      this.state.count += this.props.step;
      this.update();
    },
  },
  mounted() {
    console.log("Counter mounted");
  },
});

register("Counter", Counter);
const instance = create("Counter", { step: 2 });
if (instance) {
  mount(instance, "#app");
  // Later: unmount(instance);
}
```

`defineComponent` is an ergonomic identity helper. `register` stores a named definition. `create` returns a component instance or `null` when the name is unknown. `mount` accepts an instance or registered name and a selector, Element, or ShadowRoot. `unmount` is an alias of `destroy`.

### Props

A prop can be declared with a type string or a definition object. Supported type names are `string`, `number`, `boolean`, `object`, `array`, `function`, and `symbol`. Definitions can include `required`, `default`, and `validator`.

```ts
const UserCard = defineComponent({
  name: "UserCard",
  props: {
    name: { type: "string", required: true },
    active: { type: "boolean", default: false },
    score: {
      type: "number",
      validator: (value) => Number(value) >= 0,
    },
  },
  render() {
    return `<article>${this.props.name}</article>`;
  },
});
```

### Lifecycle and composition hooks

Definitions support `beforeCreate`, `created`, `beforeMount`, `mounted`, `beforeUpdate`, `updated`, `beforeUnmount`, and `unmounted`. Composition-style hooks are available through `setupComponent`, `onMounted`, `onUpdated`, `onDestroyed`, and `onPropsChanged`.

```ts
const instance = create("Counter");
if (instance) {
  const state = setupComponent(instance, (props) => {
    onMounted(() => console.log("ready", props));
    onDestroyed(() => console.log("removed"));
    return { ready: true };
  });
  console.log(state.ready);
}
```

## 5. Templates and directives

`compileTemplate` compiles an HTML string with interpolation and directive support. Component definitions normally use the `template` property, while standalone templates can be compiled directly.

```ts
import { compileTemplate } from "onekit-js";

const element = compileTemplate(
  `<button @click="increment">{{label}}</button>`,
  { label: "Add", increment: () => console.log("clicked") }
);

document.querySelector("#app")?.appendChild(element);
```

Keep untrusted HTML out of templates. OneKit sanitizes component HTML, filters unsafe URL/event/CSS values at VDOM and SSR boundaries, and restricts dynamic template evaluation; applications should still validate external content and never pass untrusted data to raw-markup helpers.

## 6. JSX, VDOM, and render helpers

The JSX-compatible helpers are `h`, `jsx`, `jsxDEV`, `okjs`, `component`, and `Fragment`. The VDOM helpers are `createElement`, `render`, `patch`, and the compatibility alias `vdomPatch`. Renderer updates support keyed children, prop removal, event-handler replacement, style diffing, and refs.

```ts
import { h, render, Fragment } from "onekit-js";

const view = h("main", { class: "shell" },
  h("h1", null, "OneKit"),
  h("p", null, "Small runtime, direct control."),
  h(Fragment, null, "More content")
);

document.querySelector("#app")?.appendChild(render(view));
```

For TypeScript JSX projects, configure the JSX factory according to the project compiler setup and import the OneKit JSX runtime aliases from the package.

## 7. Router

The V3 router provides a factory-based application router. It supports static and dynamic paths, params, query parsing, history/hash/memory modes, guards, async loaders, redirects, 404 routes, browser back/forward, and subscriptions.

```ts
import { createRouter } from "onekit-js";

const appRouter = createRouter([
  { path: "/", handler: () => { document.title = "Home"; } },
  {
    path: "/users/:id",
    loader: ({ to }) => fetch(`/api/users/${to.params.id}`).then(response => response.json()),
  },
  { path: "/login", beforeEnter: () => "/" },
], { mode: "history" });

await appRouter.start();
const match = await appRouter.navigate("/users/42?tab=posts");
console.log(match?.location.params.id, appRouter.getCurrentPath());

const unsubscribe = appRouter.subscribe((to, from) => {
  console.log("navigated", from?.fullPath, to.fullPath);
});
unsubscribe();
```

The router resolves navigation and data first. Applications can still subscribe to matches and connect them to any renderer, or use the optional `createRouterView()` helper to bind committed matches to the existing VDOM patcher. The helper owns only subscription, target patching, and disposal; the application still decides how a `MatchedRoute` becomes a VNode or text. `router.prefetch(path)` runs applicable guards and the route loader without changing the current route, browser history, handlers, or subscribers; use it for hover/focus or viewport-based data warming. Stop a router with `router.stop()` when its application scope is destroyed.

```ts
import { createElement, createRouter, createRouterView } from "onekit-js";

const router = createRouter([
  { path: "/", loader: () => ({ title: "Home" }) },
  { path: "/settings" },
], { mode: "history" });

const view = createRouterView(router, {
  target: document.querySelector("#app")!,
  render: ({ route, data }) => createElement(
    "main",
    { "data-route": route.path },
    typeof data === "object" && data !== null && "title" in data
      ? String(data.title)
      : route.path,
  ),
});

await router.start();
// Call view.dispose() and router.stop() with the application scope.
```

Route loaders can use the same `QueryClient` as the rest of the application. Add `queryKey` and optional `queryOptions` to a route and pass `queryClient` to the router; prefetched, hydrated, and previously loaded data can then be reused according to the query freshness policy. A router-level `loadingBoundary` tracks the latest loader attempt, while `errorBoundary` can convert a loader failure into a controlled fallback:

```ts
import { createErrorBoundary, createLoadingBoundary, createQueryClient } from 'onekit-js';
import { createRouter } from 'onekit-js/router';

const queries = createQueryClient();
const loading = createLoadingBoundary<unknown>();
const errors = createErrorBoundary({
  fallback: (error, reset) => ({ kind: 'error', message: error.message, reset }),
});

const router = createRouter([
  {
    path: '/reports',
    queryKey: ['reports'],
    queryOptions: { staleTime: 30_000 },
    loader: () => loadReports(),
  },
], { queryClient: queries, loadingBoundary: loading, errorBoundary: errors });

const navigation = router.navigate('/reports');
// Bind loading.render(loadingView, readyView) to the application renderer.
await navigation;
```

The loading boundary only tracks the latest completion state, so stale loader completions do not replace current data. Routes without `queryKey` retain their normal uncached loader behavior. `errorBoundary` receives the loader error and can expose its `reset()` callback to retry the view.

For SSR preload planning, generate a JSON-safe route manifest from the same route tree on the server and make it available to the client bootstrap. The manifest contains normalized paths, parent relationships, loader/lazy-component flags, static query keys, and route metadata; function-valued query keys, loaders, guards, and component implementations are intentionally omitted:

```ts
import { createRouteManifest } from 'onekit-js/router';

const manifest = router.getManifest();
// Equivalent for a route definition before creating the router:
const initialManifest = createRouteManifest(routes);
const payload = JSON.stringify(manifest);
```

Use the manifest to select preload candidates or avoid eagerly importing routes that are not part of the initial request. Treat it as an optimization hint rather than an authorization mechanism, and regenerate it whenever the route tree changes.

### File-based route discovery

OneKit does not require a specific bundler, but it provides a browser-safe adapter for import maps generated by tools such as `import.meta.glob`. Convert conventional `pages` or `app` file names into the existing `Route[]` and route manifest APIs without adding filesystem access to the runtime:

```ts
import { createFileRoutes, createRouteManifest, routeHref } from 'onekit-js';

const modules = import.meta.glob('/src/pages/**/*.{ts,tsx}', { eager: true });
const routes = createFileRoutes(modules, { root: '/src/pages' });
const manifest = createRouteManifest(routes);
const href = routeHref('/users/:id', { id: 42 });
```

`index.tsx` and `page.tsx` become the parent path, `[id].tsx` becomes `:id`, `[...slug].tsx` becomes `*`, `[[...slug]].tsx` becomes the optional catch-all `*?`, route-group directories such as `(marketing)` are omitted from the URL, and files beginning with `_` are ignored by default. Use `defineRoute('/reports/:id', options)` when a route literal should retain its TypeScript path type while remaining compatible with the normal router definition:

```ts
const reports = defineRoute('/reports/:id', {
  component: ReportsPage,
  loader: loadReport,
});
```

The helper only discovers and normalizes route definitions; it does not import modules itself, enforce authorization, or replace a framework-specific build plugin. Optional catch-all routes match both the parent path and deeper paths, and `routeHref('/docs/*?', {})` omits the optional segment. This keeps the API compatible with Vite, Rollup, Webpack, and custom code generators.

Loader callbacks receive a typed `RouteContext`. For a route literal, `to.params` is derived from the path, and the awaited loader return value is retained by the typed route definition. `RouteContext.signal` is aborted when a newer navigation supersedes the current one or when the router stops, so fetch-like loaders should pass it to cancellable work. `RouteLoaderData<typeof loader>` extracts the awaited result of an existing loader function, while `RouteContextFor<Path, AppContext>` gives service-heavy applications an explicit context contract:

```ts
import {
  createRouter,
  defineRoute,
  type RouteContextFor,
  type RouteLoaderData,
} from 'onekit-js';

type Services = { api: { getUser(id: string): Promise<{ id: string }> } };
const loadUser = async ({ to, context }: RouteContextFor<'/users/:id', Services>) =>
  context.api.getUser(to.params.id);
type UserData = RouteLoaderData<typeof loadUser>; // { id: string }

const userRoute = defineRoute('/users/:id', { loader: loadUser });
const router = createRouter([userRoute], {
  mode: 'memory',
  context: { api },
});
```

`RouterOptions.context` is passed unchanged to `beforeEach`, `beforeEnter`, `loader`, `queryKey`, `handler`, and `afterEach`. This makes dependency injection explicit for both browser navigation and SSR without relying on module-level mutable state.

For typed route parameters, use `RouteParamsFor<Path>` with a route literal. Static paths require no parameters, named segments such as `:id` become required string properties, optional segments such as `:tab?` become optional properties, and catch-all segments use the `wildcard` property:

```ts
import { routeHref, type RouteParamsFor } from 'onekit-js';

const params: RouteParamsFor<'/users/:id'> = { id: '42' };
const href = routeHref('/users/:id', params); // /users/42
```

Nested layouts can be declared without changing the normal `Route[]` contract. `defineLayoutRoute` keeps the parent layout and its child route literals together so the existing router and route manifest can compose them parent-to-leaf:

```ts
import { defineLayoutRoute, defineRoute } from 'onekit-js';

const dashboard = defineLayoutRoute('/dashboard', DashboardLayout, [
  defineRoute('/settings', { component: SettingsPage }),
  defineRoute('/billing', { component: BillingPage }),
]);
```

The layout helper is metadata and composition information; it does not impose a rendering strategy. Applications may render `layout`, `components`, and matched route data using their preferred renderer while retaining compatibility with the standard router.

When the Vite plugin is enabled, import the declaration-only companion to obtain the generated route-path union and parameter inference. The runtime module remains ordinary JavaScript and `Route[]`; the declaration module is a TypeScript tooling contract:

```ts
import type { FileRouteParams, FileRoutePath } from 'virtual:onekit/routes.d.ts';

const routePath: FileRoutePath = '/users/:id';
const routeParams: FileRouteParams<typeof routePath> = { id: 'u-1' };
```

The generated declaration module also maps each concrete path to its discovered route module. When a page exports a typed `route.loader` and a typed default component, use `FileRouteLoaderData<Path>` and `FileRouteComponentProps<Path>` to keep data and props aligned:

```ts
import type {
  FileRouteComponentProps,
  FileRouteLoaderData,
} from 'virtual:onekit/routes.d.ts';

type ReportData = FileRouteLoaderData<'/reports/:id'>;
type ReportProps = FileRouteComponentProps<'/reports/:id'>;
```

These helpers infer only statically declared module types. They do not inspect runtime-loaded components, validate arbitrary runtime props, or replace application-level schemas.

For applications that want directory-scoped infrastructure, pass the eager module map to `composeFileRouteInfrastructure()`. It returns page routes with root-to-leaf layout values and middleware values, but does not inject them into Router navigation or select a rendering strategy:

```ts
import { composeFileRouteInfrastructure } from 'onekit-js';

const composed = composeFileRouteInfrastructure(import.meta.glob('/src/app/**/*.{ts,tsx}', { eager: true }), {
  root: '/src/app',
});
const firstPage = composed[0];
// firstPage.route, firstPage.layouts, and firstPage.middleware are application-owned.
```

## 8. Stores and plugins

### Stores

Define a named store with a `state()` factory, actions, and optional getters according to the store definition used by the project. Retrieve it with `useStore`, inspect all stores with `getAllStores`, and remove it with `removeStore`. Call `$reset()` to restore the initial state shape, or `$dispose()` when the store belongs to a disposable application scope. For SSR or concurrent requests, create a separate `createStoreRegistry()` per request so state and plugins do not cross request boundaries.

```ts
import { defineStore, useStore } from "onekit-js";

const counter = defineStore("counter", () => ({
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.$state.count = Number(this.$state.count) + 1;
    },
  },
}));

const sameCounter = useStore<typeof counter>("counter");
sameCounter.increment();
sameCounter.$reset();
// Use counter.$dispose() when this application scope is destroyed.
```

If the application uses a definition object rather than a setup callback, pass the object directly to `defineStore` or `createStore`. A registry exposes the same operations with `registry.defineStore()`, `registry.useStore()`, `registry.addPlugin()`, and `registry.dispose()`:

```ts
import { createStoreRegistry } from "onekit-js";

const requestStores = createStoreRegistry();
const requestUser = requestStores.defineStore("request-user", () => ({
  state: () => ({ id: null as string | null }),
}));
// Dispose the registry at the end of the request.
requestStores.dispose();
```

### Plugins and dependency injection

Use the plugin manager for application-wide extensions. `DependencyInjector` and the singleton `di` provide service registration and resolution.

```ts
import { pluginManager, di } from "onekit-js";

pluginManager.use({
  name: "logger",
  install() {
    console.log("logger installed");
  },
});

di.provide("apiBase", "https://api.example.com");
const base = di.get("apiBase");
```

Use the exact `Plugin` and service definition types exported by the package when authoring reusable integrations.

## 9. SSR and hydration

SSR helpers render a VNode or string to a `RenderResult`, provide a request-scoped `SSRContext`, and expose head/body/style/script helpers.

```ts
import {
  createSSRContext,
  renderToString,
  hydrate,
  HydrationMismatchError,
  StreamingRenderer,
  addToHead,
  setMeta,
  renderTitle,
  h,
} from "onekit-js";

const context = createSSRContext();
addToHead(context, renderTitle("OneKit page"));
setMeta(context, "description", "A OneKit page");

const result = renderToString(h("main", null, "Rendered on the server"), context);
console.log(result.html);
```

Use `hydrate(rootElement, vnode)` on the client when the server-rendered DOM should be connected to the client view. Hydration returns `{ mismatches, hasMismatch, firstMismatch, dispose }`: `mismatches` reports tag, text, missing-node, attribute, and unexpected-node parity failures without rewriting the server DOM, while `dispose()` removes listeners attached by hydration. The existing `isServer()` and `isClient()` helpers remain available. V3 also exposes `getRuntimeEnvironment()`, `isServerRuntime()`, `isClientRuntime()`, `serverOnly()`, `clientOnly()`, `assertServer()`, and `assertClient()` from the root package for explicit server/client boundaries:

```ts
import {
  assertClient,
  clientOnly,
  getRuntimeEnvironment,
  serverOnly,
} from 'onekit-js';

const environment = getRuntimeEnvironment();
const serverValue = serverOnly(() => loadPrivateData());
const browserValue = clientOnly(() => window.localStorage.getItem('key'));

if (environment === 'client') assertClient();
```

Boundary callbacks are evaluated only in their matching environment; use them for optional side effects, not for values that are required during both SSR and client rendering. `withCache` can cache repeated SSR render work when its cache key and lifecycle are controlled by the application.

For structured hydration diagnostics, pass `onMismatch` to receive each mismatch after the hydration walk. `throwOnMismatch` is opt-in and throws `HydrationMismatchError` after collecting the full mismatch list; the default behavior remains non-throwing and does not rewrite server DOM:

```ts
try {
  const result = hydrate(root, App(), {
    onMismatch: (mismatch) => reportHydrationMismatch(mismatch),
    throwOnMismatch: process.env.NODE_ENV === 'test',
  });
  console.log(result.hasMismatch, result.firstMismatch);
} catch (error) {
  if (error instanceof HydrationMismatchError) {
    reportHydrationFailure(error.mismatches);
  }
}
```

`StreamingRenderer.renderToStream()` accepts an optional `onError` callback. It receives the original render failure or `AbortError` once, before the stream is aborted, so a server adapter can map the error to its own request logging and recovery policy. Progressive boundaries can emit a visible fallback shell first and a continuation chunk when the async content settles:

```ts
import { createStreamingBoundary, applyStreamingContinuation } from "onekit-js";

const boundary = createStreamingBoundary("profile-card", {
  fallback: '<p aria-busy="true">Loading profile…</p>',
  render: async () => `<article>${await loadProfileHtml()}</article>`,
});

const firstChunk = boundary.fallbackChunk();
const continuation = await boundary.contentChunk();
// Send both chunks through the response stream in order.
// In the browser, applyStreamingContinuation(continuation) replaces the shell.
void firstChunk;
void applyStreamingContinuation;
```

The continuation helper is import-safe on the server and applies only trusted framework-generated chunks. Applications should preserve chunk order, abort the boundary with the request signal, and keep user-controlled HTML escaped before passing it to the renderer.

```ts
const stream = await new StreamingRenderer(context).renderToStream(App(), {
  signal: request.signal,
  onError: (error) => logServerRenderFailure(error),
});
```

```ts
const hydration = hydrate(root, App());
if (hydration.mismatches.length > 0) {
  console.warn("OneKit hydration mismatch", hydration.mismatches);
}
// Call hydration.dispose() when the root is removed.
```

For SSR data handoff, use one `QueryClient` per request on the server, dehydrate only after the relevant queries settle, serialize the snapshot through the application’s trusted transport, and hydrate a fresh client-side instance before rendering interactive views:

```ts
import { createQueryClient } from 'onekit-js';

// Server request scope
const serverQueries = createQueryClient();
await serverQueries.fetch(['dashboard', 'summary'], loadDashboard);
const dehydrated = serverQueries.dehydrate();
const payload = JSON.stringify(dehydrated); // escape/transport using the application’s SSR policy

// Browser application scope
const clientQueries = createQueryClient();
clientQueries.hydrate(JSON.parse(payload));
const summary = clientQueries.getState<DashboardSummary>(['dashboard', 'summary']);
```

For route-driven data, pass the same client to `createRouter` and give each data-owning route a stable `queryKey`. The router uses `queryOptions.staleTime` to decide whether a hydrated or previously loaded result can be reused; a route without `queryKey` keeps the original uncached loader behavior.

```ts
const router = createRouter([
  {
    path: '/dashboard',
    queryKey: ['dashboard', 'summary'],
    queryOptions: { staleTime: 30_000 },
    loader: () => loadDashboard(),
  },
], { mode: 'memory', queryClient: clientQueries });
```

`dehydrate()` exports settled `success` and `error` states only; pending requests and active loader promises are never serialized. `hydrate()` does not run loaders or notify subscribers, so it can be called before subscriptions are mounted. Use request-scoped clients and validate/escape the transport payload rather than embedding untrusted JSON directly into executable markup.

For recoverable synchronous and asynchronous failures, use the framework boundary primitives:

```ts
import { createErrorBoundary, createLoadingBoundary } from "onekit-js";

const errors = createErrorBoundary({
  fallback: (error) => h("p", {}, `Could not render: ${error.message}`),
});
const loading = createLoadingBoundary<string>();

const view = errors.render(() => renderPage(), "route-render");
await loading.run(() => fetchPage());
```

`createErrorBoundary` captures sync work, async work through `runAsync`, exposes `state.error`, and provides `reset()`. `createLoadingBoundary` exposes `state.pending` and a `render(loading, ready)` helper. These are primitives for route loaders, app shells, and SSR adapters; they do not automatically replace an application router or renderer.

## 10. HTTP API helpers

The API module provides `request`, `get`, `post`, `put`, `del`, `patch`, and the `API` class.

```ts
import { get, post } from "onekit-js";

const response = await get("/api/items");
const created = await post("/api/items", { name: "Notebook" });
console.log(response.data, created.data);
```

Request options can include headers and other supported fetch settings. Keep authentication and error handling at the application boundary; do not put secrets in browser source code.

## 11. Storage and caching

Use the exported `localStorage`, `sessionStorage`, and `cache` wrappers, or create a namespaced wrapper from a browser Storage object.

```ts
import { localStorage, createStorage } from "onekit-js";

localStorage.set("theme", "light");
const theme = localStorage.get("theme");
localStorage.remove("theme");

const preferences = createStorage(window.localStorage, { prefix: "prefs_" });
preferences.set("density", "compact");
```

Storage keys are validated to reduce prototype-pollution risks. Treat stored values as untrusted input and validate them when reading.

## 12. Accessibility

The accessibility module provides ARIA attributes, announcements, focus trapping, skip links, tab-order helpers, landmarks, and validation.

```ts
import {
  setAriaAttributes,
  announce,
  trapFocus,
  createSkipLink,
} from "onekit-js";

const dialog = document.querySelector("#dialog");
if (dialog) {
  setAriaAttributes(dialog, { role: "dialog", "aria-modal": "true" });
  const release = trapFocus(dialog);
  announce("Dialog opened", "polite");
  void release;
}

document.body.prepend(createSkipLink("#main"));
```

Use semantic HTML first, then add ARIA only where it communicates state or relationships that HTML cannot express by itself.

## 13. Security helpers

Use `sanitizeHTML`, `sanitizeInput`, and `sanitizeURL` for untrusted values. `validateJSON`, `validateSelector`, and `validateStorageKey` help reject malformed or dangerous input. `updateSecurityConfig`, `getSecurityConfig`, and `generateCSPHeader` support application-specific security policy configuration.

```ts
import { sanitizeHTML, sanitizeURL, generateCSPHeader } from "onekit-js";

const safeMarkup = sanitizeHTML(userProvidedMarkup);
const safeHref = sanitizeURL(userProvidedUrl);
const csp = generateCSPHeader({
  "script-src": ["'self'"],
});
```

Sanitization is not a substitute for server-side authorization, CSRF protection, secure cookies, or output encoding in non-HTML contexts.

## 14. Utilities and animations

The utility module exports `debounce`, `throttle`, `deepClone`, and `generateId`.

```ts
import { debounce, throttle, generateId } from "onekit-js";

const saveLater = debounce(() => saveDraft(), 250);
const onScroll = throttle(() => updateHeader(), 100);
console.log(generateId());
```

The `animations` export contains the built-in DOM animation helpers. Prefer transform and opacity transitions, keep interaction feedback short, and respect `prefers-reduced-motion` in application CSS.

## 15. Web Components

Register a component as a custom element with `registerWebComponent` or extend `OneKitWebComponent` for a custom implementation.

```ts
import { registerWebComponent } from "onekit-js";

registerWebComponent("user-badge", {
  name: "UserBadge",
  template: `<span>{{label}}</span>`,
  data: () => ({ label: "OneKit user" }),
});

// HTML: <user-badge></user-badge>
```

Custom element names must contain a hyphen. Use the `options` argument to configure the Web Component behavior supported by the current release.

## 16. Metadata, SEO, and document head

The V3 head module provides a small framework-level metadata contract for application shells. It is safe to use in SSR adapters because `renderHead()` is a pure function and does not access browser globals.

```ts
import { createHeadManager, renderHead } from 'onekit-js/head';

const metadata = {
  title: 'Project dashboard',
  description: 'Track project activity and reports.',
  keywords: ['projects', 'reports'],
  robots: 'index,follow',
  canonical: 'https://example.test/projects',
  openGraph: { title: 'Project dashboard', type: 'website' },
  twitter: { card: 'summary' },
};

const headHtml = renderHead(metadata);
```

In a browser application, create one manager for the application shell and dispose it when that shell is destroyed:

```ts
const head = createHeadManager(metadata);
head.mount(document);
head.update({ title: 'Project dashboard — Reports' });
head.clear();
head.dispose();
```

`renderHead()` escapes values and emits deterministic `<title>`, `<meta>`, and canonical `<link>` tags. `createHeadManager()` marks only the nodes it owns, so unrelated tags placed by the host application are preserved during updates and cleanup. Open Graph keys are emitted as `og:<key>` properties, while Twitter keys are emitted as `twitter:<key>` names. The module is also exported from the root package.

For route-driven applications, pass the manager to the router and define `head` on route records. Parent and leaf metadata are composed from parent to leaf; scalar values use the leaf value, while Open Graph and Twitter maps are shallow-merged:

```ts
import { createHeadManager, createRouter } from 'onekit-js';

const head = createHeadManager();
const router = createRouter([
  {
    path: '/app',
    head: { title: 'App', openGraph: { siteName: 'OneKit' } },
    children: [{
      path: '/dashboard',
      head: { title: 'Dashboard', description: 'Reports', openGraph: { title: 'Dashboard' } },
    }],
  },
], { head });

await router.navigate('/app/dashboard');
// head.get() => { title: 'Dashboard', description: 'Reports',
//   openGraph: { siteName: 'OneKit', title: 'Dashboard' } }
```

The router updates the manager only after guards and loaders succeed, so failed or cancelled navigations do not replace the active document metadata. Call `head.dispose()` together with router/application teardown.

## 17. Experimental DevTools foundation

OneKit includes an **opt-in DevTools bridge** for framework inspection. It is disabled by default, safe to import during SSR, and must never be required for application execution. Enable it only in development or controlled diagnostics builds:

```ts
import { enableDevTools, onDevToolsEvent } from 'onekit-js';

const bridge = enableDevTools({
  historySize: 100,
  installGlobal: false
});
const unsubscribe = onDevToolsEvent(event => {
  if (event.type === 'reactive:trigger') {
    console.debug('state changed', event.key, event.oldValue, event.newValue);
  }
  if (event.type === 'router:navigation') {
    console.debug('navigation', event.phase, event.to);
  }
});

// On application teardown:
unsubscribe();
bridge.dispose();
```

The current experimental events include `reactive:trigger`, `reactive:effect`, `router:navigation`, lifecycle events, and `performance:measure`. Reactive events expose stable numeric target/effect identifiers rather than private proxy objects. Router events report `start`, `success`, `cancel`, or `error` phases with destination, origin, route, and loader error metadata where available. Performance events report a measurement name, non-negative duration, and `success` or `error` status. Event listeners are isolated: an exception inside a DevTools listener is ignored and cannot break the application.

The bridge stores a bounded, detached event history for diagnostics. Use `getHistory()` to inspect recent events, `getMetadata()` to inspect the active history size and listener count, and `clearHistory()` to reset the buffer:

```ts
const recent = bridge.getHistory();
const metadata = bridge.getMetadata();
bridge.clearHistory();

const value = bridge.measure('render-dashboard', () => renderDashboard());
const asyncValue = await bridge.measure('load-dashboard', async () => loadDashboard());
```

For browser-only tooling, pass `installGlobal: true` and an optional `globalName`. OneKit installs the bridge on `window` only when a browser `window` exists; it does not create or mutate browser globals during SSR. The default history capacity is 100 events and can be lowered to limit diagnostic memory use.

`measureDevTools(name, task)` is also available as a standalone helper for code that does not retain a bridge. It returns the task result unchanged, supports synchronous and asynchronous tasks, emits a `performance:measure` event, and rethrows task errors after recording an `error` measurement.

For TypeScript projects using automatic JSX transforms, import `jsx`, `jsxs`, and `Fragment` from `onekit-js/jsx-runtime` or configure the compiler's JSX import source to that subpath. The runtime removes the JSX `children` field from element props and preserves the optional JSX key in the generated VNode.

This API is **experimental**. Event names and payload fields may change before a stable DevTools release. Do not use it as an application data bus, and do not enable it in production unless the diagnostic overhead and information exposure have been reviewed. Event payloads can include changed values and loader errors, so avoid enabling it where those values would violate privacy or security requirements.

## 18. Versioning and migration

V3 is the framework-grade API line. The most important V3 additions are `defineComponent`, `unmount`, `nextTick`, expanded public exports, CLI project generation/building, SSR helpers, stores, templates, JSX, and Web Components.

When migrating an older project, first replace internal module imports with public root imports, then run type-check and the regression suite. Replace manual component-definition identity wrappers with `defineComponent`, use `unmount` for teardown, and use `nextTick` when DOM assertions must wait for the reactive microtask.

Keep the package version, `VERSION` constant, README, CHANGELOG, examples, and website banner synchronized before publishing.

## 19. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Component "X" not found` | The component was not registered or the name differs | Call `register("X", definition)` before `create` or `mount`. |
| `Invalid target element` | The selector did not resolve | Ensure the target exists before mounting and run after DOM creation. |
| State changes but the DOM does not update | No effect is subscribed, or a component was mutated without `update()` | Use `effect`, or call the component instance's `update()` after a method mutation. |
| SSR output differs from browser output | Browser-only APIs run during server rendering | Guard with `isClient()` and keep SSR context request-scoped. |
| CLI build cannot find an entrypoint | The project has no library entrypoint and no `build` script | For a Vite-style app, add a `build` script; for a library, configure `source` or use `src/index.ts`/`src/index.js`, then run the command from the project directory. |
| User HTML appears unsafe | External markup was rendered directly | Sanitize it and keep untrusted content out of executable attributes. |
| Focus escapes a modal | Focus trap was not released or the container is not mounted | Call `trapFocus` after mount and invoke the returned cleanup function on teardown. |

## 20. Release verification

Run the complete release checks from the repository root:

```bash
npm run type-check
npm test -- --runInBand
npm run build
npm run verify:package
npm audit --omit=dev
npm pack --dry-run
```

`npm run verify:package` creates an isolated temporary project, installs the packed tarball, and checks the root, ESM, CJS, SSR, and CLI entrypoints. Then inspect the tarball contents and verify that the package version, declaration paths, CLI files, README, documentation, and license are present. Pull requests and pushes to the `V3` branch also run the same checks through GitHub Actions. For the main package, publication is handled by `.github/workflows/publish-onekit.yml`. After validation passes, bump the package version, commit the release metadata, and push a matching tag:

```bash
npm version 3.1.19 --no-git-tag-version
git add package.json package-lock.json src/index.ts CHANGELOG.md README.md docs
git commit -m "chore(release): prepare onekit 3.1.19"
git push origin V3
git tag v3.1.19
git push origin v3.1.19
```

The creator package is published independently through `create-onekit-v1.0.8`. The generated starter currently uses the installable compatibility floor `onekit-js@^3.1.18`, which resolves the newest compatible V3 release from npm; after `3.1.19` is published, the same caret range resolves to that patch automatically. If a creator release pins `^3.1.19` directly, publish `onekit-js` first so that exact range is available. A manual `npm publish --access public` remains possible for an authenticated npm session, but the tag workflow is preferred because it provides repeatable validation and npm provenance.

Never place an npm access token in source files, commit history, chat messages, or public documentation.

## References

[1]: ../src/index.ts "OneKit V3 public entry point"  
[2]: ../src/modules/reactive.ts "Reactive state implementation"  
[3]: ../src/modules/component.ts "Component and lifecycle implementation"  
[4]: ../src/modules/router.ts "Router implementation"  
[5]: ../src/modules/store.ts "Store implementation"  
[6]: ../src/modules/ssr.ts "SSR implementation"  
[7]: ../bin/onekit.js "OneKit CLI entry point"  
[8]: ../lib/cli/create.js "OneKit create command"  
[9]: ../lib/cli/build.js "OneKit build command"  
[10]: ../lib/cli/run.js "OneKit project workflow command runner"  
[11]: ../src/core/devtools.ts "OneKit experimental DevTools bridge"


## 0. Beginner-first application API

For a new application, prefer the small ergonomic layer exported from the package root. It keeps the existing lower-level V3 APIs available while reducing the number of concepts needed for a first component.

```ts
import { createApp, state, derive, watchEffect } from 'onekit-js';

const todos = state({ items: [] as { id: number; title: string; done: boolean }[] });
const openCount = derive(() => todos.items.filter((todo) => !todo.done).length);

const stopLogging = watchEffect(() => {
  console.log(`${openCount.value} open tasks`);
});

const app = createApp({
  setup: () => ({ todos, openCount }),
  template: `
    <section>
      <p>{{openCount.value}} open tasks</p>
      <ul ok-for="todo in todos.items">
        <li>{{todo.title}}</li>
      </ul>
    </section>
  `,
});

app.mount('#app');
// Call stopLogging() when the surrounding application scope is disposed.
```

`state(object)` returns the normal reactive proxy, while `state(primitive)` returns an explicit ref with a `.value` property. This boundary is intentional: JavaScript cannot make an ordinary primitive binding such as `count++` update a runtime signal without a compiler transform. The ergonomic layer therefore stays predictable and type-safe instead of promising unsupported syntax.

| Need | React | Vue | OneKit V3 ergonomic layer |
|---|---|---|---|
| Primitive state | `useState(0)` and a setter | `ref(0)` and `.value` | `state(0)` and `.value` |
| Object state | `useState({})` plus immutable updates | `reactive({})` | `state({})` |
| Derived value | `useMemo(fn, deps)` | `computed(fn)` | `derive(fn)` |
| Reactive effect disposal | `useEffect` cleanup | `watchEffect` stop handle | `watchEffect(fn)` returns disposer |
| First mount | `createRoot(...).render(...)` | `createApp(...).mount(...)` | `createApp(definition).mount(target)` |

For `.okjs` single-file components, the recommended V3 shape is:

```okjs
<script lang="ts">
import { state } from 'onekit-js';

export default {
  name: 'Counter',
  setup: () => ({
    count: state(0),
    increment() {
      this.count.value += 1;
    },
  }),
};
</script>

<template>
  <button ok-on.click="increment()">Count: {{count.value}}</button>
</template>
```

The existing `reactive`, `effect`, `watch`, `register`, `create`, and `mount` APIs remain supported for advanced applications and migration compatibility.

## Testing, query, and forms foundations

OneKit 3.1.19 includes a small DOM-first testing foundation from `onekit-js/testing`. `renderTest()` mounts a VNode into an isolated container and provides `rerender()` and `unmount()`; `cleanup()` removes containers registered by the helper; `fireEvent()`, `flush()`, and `waitFor()` support common synchronous and asynchronous component tests.

```ts
import { h } from "onekit-js";
import { cleanup, fireEvent, renderTest, waitFor } from "onekit-js/testing";

const view = renderTest(h("button", { onClick: save }, "Save"));
fireEvent(view.container.querySelector("button")!, "click");
await waitFor(() => expect(view.container.textContent).toContain("Saved"));
view.unmount();
cleanup();
```

The `onekit-js/query` entry point provides a framework-neutral `QueryClient` with request deduplication, stale-time reads, subscribers, manual `setData()`, invalidation, removal, cache clearing, retry, cancellation, mutation lifecycle hooks, and shared cache tags. It is intentionally a small primitive rather than a replacement for a server-state ecosystem.

```ts
const queries = createQueryClient();
const todos = await queries.fetch(["todos", userId], ({ signal }) => api.listTodos(userId, signal), {
  staleTime: 30_000,
  retry: 2,
  retryDelay: 100,
});
queries.invalidateQueries(["todos", userId]);
queries.cancel(["todos", userId]);

// Tags let route loaders and direct queries share one invalidation policy.
queries.invalidateTag(`user:${userId}`);
await queries.revalidateTag(`user:${userId}`);
```

Mutations support success/error/settled callbacks and optional optimistic updates. If the mutation fails, the previous cached value is restored unless a custom rollback function is supplied:

```ts
await queries.mutate(
  { id: userId },
  {
    mutationFn: ({ id }, { signal }) => api.archiveUser(id, signal),
    optimistic: {
      key: ["users"],
      update: (current, variables) => removeUser(current, variables.id),
    },
    onSuccess: () => queries.invalidateQueries(["users"]),
  },
);
```

A client can persist settled query state and revalidate remembered loaders after browser focus or network reconnect. Persistence is best-effort: use a storage adapter appropriate for the application, avoid storing secrets, and create one client per SSR request. The adapter may be synchronous or asynchronous. For browser caches that should not compete with the limited quota of Web Storage, OneKit also provides an optional IndexedDB adapter. It is safe to construct during SSR; on runtimes without IndexedDB, reads return `null` and writes become no-ops.

```ts
import { createIndexedDBQueryStorage, createQueryClient } from "onekit-js";

const queryStorage = createIndexedDBQueryStorage({
  databaseName: "my-app-cache",
  storeName: "query-state",
});

const queries = createQueryClient({
  persistence: {
    storage: queryStorage,
    key: "my-app-query-cache",
    maxAge: 24 * 60 * 60 * 1000,
  },
  revalidateOnWindowFocus: true,
  revalidateOnReconnect: true,
});

await queries.fetch(["account"], loadAccount, { tags: ["account"], revalidate: 30_000 });
// The remembered loader is re-run after focus/reconnect.
await queries.revalidate("manual");
// Call queries.dispose() when the application scope is destroyed.
```

`QueryClient` persistence serializes settled states through `dehydrate()` and restores them without executing loaders. Serialization failures are ignored so cache persistence cannot break application startup. The IndexedDB adapter stores each configured persistence key as one record in the selected object store and closes its database connection after each operation. Do not persist authentication tokens or other sensitive data in browser storage, and use an explicit server-safe storage adapter during SSR. Cross-tab synchronization is intentionally application-controlled. `createQueryBroadcastSync()` provides a small opt-in invalidation bridge: it broadcasts only the normalized query key, never cached data or errors, and safely becomes inactive when `BroadcastChannel` is unavailable. A compatible custom channel can be injected for tests or other runtimes.

```ts
import { createQueryBroadcastSync } from "onekit-js";

const querySync = createQueryBroadcastSync(queries, {
  channelName: "my-app-query-sync",
});

// In another tab, the matching query becomes stale without sharing its payload.
querySync.publishInvalidate(["account"]);

// Dispose together with the application scope.
querySync.dispose();
```

Applications that need cross-tab data transfer, authenticated coordination, or custom conflict resolution should define those messages outside this helper and validate every received value. The helper also exposes `publishInvalidateTag(tag)`; it sends only the tag, never cached data, errors, or credentials.

## ISR and cache-aware revalidation

`createISRRenderer()` provides a small server-side stale-while-revalidate layer for concrete rendered pages. A fresh page is a cache hit, an expired page is returned as stale while one regeneration runs in the background, and a missing page is rendered synchronously. The same `tags` and `revalidate` vocabulary can be shared with `QueryClient`; use an injected durable cache for production deployments.

```ts
import { createISRRenderer, createMemoryISRCache } from "onekit-js/isr";

const pages = createISRRenderer({
  cache: createMemoryISRCache(),
  revalidate: 60_000,
  tags: path => path.startsWith("/docs") ? ["docs"] : ["shell"],
  render: ({ path, signal }) => renderApplicationPath(path, { signal }),
});

const response = await pages.renderISRPage("/docs/start");
if (response.revalidation) await response.revalidation;
await pages.revalidateTag("docs");
```

The memory cache is a reference implementation only. Applications own authorization, persistence, distributed locking, webhook verification, eviction, observability, response headers, and deployment policy. ISR does not create RSC/Flight payloads or replace a deployment adapter.

## Secure SSR route-data handoff

`Router.dehydrate()` and `QueryClient.dehydrate()` are local snapshot APIs. For an application-owned server-to-browser handoff, use `createRouteDataPayload()` to apply strict JSON-safe filtering, size/depth/string limits, optional redaction, expiry, URL binding, and optional Web Crypto HMAC signing. Use a request-scoped signing key on the server and never embed that secret in the client bundle.

```ts
import {
  applyRouteDataPayload,
  createHmacSha256Signer,
  createRouteDataPayload,
  parseRouteDataPayload,
} from "onekit-js";

// Server adapter: emit this string in a safe data script or response body.
const signer = await createHmacSha256Signer(process.env.ROUTE_DATA_SECRET!);
const routeData = await createRouteDataPayload(router.dehydrate()!, {
  signer,
  ttl: 30_000,
  redact: (path, value) => path.endsWith(".token") ? undefined : value,
}, queries.dehydrate());

// Browser adapter: validate before touching Router or QueryClient.
const payload = await parseRouteDataPayload(serializedRouteData, {
  signer,
  requireSignature: true,
  expectedFullPath: window.location.pathname + window.location.search,
  maxAge: 30_000,
});
if (payload) applyRouteDataPayload(payload, router, queries);
```

A parser rejection returns `null` and must be treated as an untrusted or stale handoff; the application can continue with a normal navigation or query load. The transport is not a React Server Components or Flight runtime: it carries explicitly selected JSON-safe route/query data and does not serialize components, create client references, or implement Server Functions. See [`V3_SSR_ROUTE_DATA.md`](./V3_SSR_ROUTE_DATA.md) for limits and adapter responsibilities.

The `onekit-js/forms` entry point provides typed values, touched state, synchronous or asynchronous validation, guarded submit, reset, and subscriptions. Application-specific schema adapters can be layered on top without coupling the framework to a validation library.

```ts
const form = createForm({ email: "" }, values =>
  values.email.includes("@") ? {} : { email: "Enter a valid email" },
);
form.setField("email", "user@example.com");
await form.submit(values => saveUser(values));
```

Hydration compares meaningful whitespace, case-insensitive attribute names, boolean properties, object styles, fragments, and nested component output without mutating server DOM. Mismatches remain observable through the returned `mismatches` array, and event listeners are removed by `dispose()`.

## 7.1 Advanced router and accessibility contracts

Routes may provide a typed `lazy` component loader. OneKit resolves the loader once before committing navigation and unwraps an ES module `default` export when present. `router.prefetch(path)` resolves guards, lazy components, and loader data without changing the current route, browser history, handlers, or subscribers.

The router passes the matched location, including decoded params and query values, to guards, loaders, and handlers. Applications can provide `scrollBehavior(to, from)` in router options to restore or reposition scroll state after a successful navigation.

`trapFocus(container)` safely handles empty containers and returns a cleanup function that removes the keyboard handler and restores the element that was focused before the trap was activated. This makes modal and drawer lifecycles safer for keyboard and assistive-technology users.

## Nested typed layouts

Routes may declare `children` to create a parent-to-leaf matched chain. Parent routes can provide `component` or `layout`, guards, lazy components, and loaders; child routes add the leaf page. Navigation resolves guards, lazy components, and loaders from parent to leaf, while merged params are available through every `RouteContext`.

```ts
const router = createRouter([
  {
    path: '/workspace/:workspaceId',
    component: WorkspaceLayout,
    loader: ({ to }) => loadWorkspace(to.params.workspaceId),
    children: [
      {
        path: '/settings',
        component: SettingsPage,
        loader: ({ to }) => loadSettings(to.params.workspaceId),
      },
    ],
  },
]);

const result = await router.navigate('/workspace/acme/settings');
result?.components;  // [WorkspaceLayout, SettingsPage]
result?.dataByRoute;  // parent and leaf loader values
result?.matched;      // parent-to-leaf route records
```

The `afterEach` callback retains its existing `matched` `MatchedRoute` value for compatibility and additionally receives `routeMatches`, containing the parent-to-leaf records. `router.prefetch()` resolves the same nested guards, lazy components, and loaders without changing the current route, history, or subscribers.
