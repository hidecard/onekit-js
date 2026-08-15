# OneKit JS

**OneKit JS V3** is a compact, TypeScript-first reactive JavaScript framework for browser applications. It provides explicit APIs for reactive state, components, templates, JSX/VDOM, routing, stores, SSR/hydration, HTTP, browser storage, accessibility, security, plugins, dependency injection, animations, Web Components, DevTools inspection, disposable scopes, and Vite HMR tooling.

> **Current release:** `3.1.13`
> **License:** MIT
> **Runtime:** Browser-first JavaScript and TypeScript
> **Repository:** [github.com/hidecard/onekit-js](https://github.com/hidecard/onekit-js)

This README is a practical user guide. It starts with the smallest possible application and progresses to production architecture. For the complete API walkthrough and migration examples, read the [V3 Usage Guide](docs/V3_USAGE.md) and [V3 Migration Guide](MIGRATION_GUIDE.md).

## Table of Contents

1. [Installation](#installation)
2. [Create a project](#create-a-project)
3. [Your first reactive application](#your-first-reactive-application)
4. [Reactive state](#reactive-state)
5. [Components](#components)
6. [Templates and directives](#templates-and-directives)
7. [JSX and VDOM](#jsx-and-vdom)
8. [Routing](#routing)
9. [Stores](#stores)
10. [Disposable scopes and teardown](#disposable-scopes-and-teardown)
11. [SSR and hydration](#ssr-and-hydration)
12. [Error and loading boundaries](#error-and-loading-boundaries)
13. [HTTP, storage, and accessibility](#http-storage-and-accessibility)
14. [Security](#security)
15. [Plugins and dependency injection](#plugins-and-dependency-injection)
16. [Vite and HMR](#vite-and-hmr)
17. [DevTools](#devtools)
18. [CLI commands](#cli-commands)
19. [Testing and production verification](#testing-and-production-verification)
20. [Performance and benchmarking](#performance-and-benchmarking)
21. [TypeScript and package imports](#typescript-and-package-imports)
22. [Troubleshooting](#troubleshooting)
23. [Documentation and release resources](#documentation-and-release-resources)

## Installation

Install OneKit in an existing application:

```bash
npm install onekit-js
```

OneKit ships its own TypeScript declarations. Import public APIs from the package root rather than reaching into `src/` files:

```ts
import { reactive, effect, defineComponent, mount } from "onekit-js";
```

The package also exposes the Vite tooling subpath:

```ts
import { oneKitVitePlugin, preserveHMRState } from "onekit-js/vite";
```

Use the root import for runtime APIs. Use `onekit-js/vite` only from Vite configuration or development tooling code.

## Create a project

The fastest path is the built-in starter generator:

```bash
npm create onekit@latest my-app
cd my-app
npm install
npm run dev
```

Equivalent commands are available when the package is already installed or when using the package without a global installation:

```bash
npx --yes --package=onekit-js onekit create my-app
npx create-onekit my-app
```

The generated project contains a Vite-compatible entrypoint, TypeScript source, a Vite configuration, and a starter component. Build and preview it with:

```bash
onekit build
onekit preview
```

For JavaScript instead of TypeScript, use one of the following supported forms:

```bash
onekit create my-app --javascript
onekit create my-app --template js
```

Use `--cwd` when a command must run in another project, and pass additional arguments after `--`:

```bash
onekit dev --cwd ./my-app -- --host 0.0.0.0
onekit preview --cwd ./my-app -- --port 4173
onekit test --cwd ./my-app -- --watch
```

## Your first reactive application

The following example works in a browser page containing `#count` and `#increment` elements:

```ts
import { reactive, effect } from "onekit-js";

const state = reactive({ count: 0 });

const stop = effect(() => {
  const output = document.querySelector("#count");
  if (output) output.textContent = String(state.count);
});

document.querySelector("#increment")?.addEventListener("click", () => {
  state.count += 1;
});

// Call stop() when the application root is permanently removed.
void stop;
```

```html
<main>
  <output id="count">0</output>
  <button id="increment" type="button">Increment</button>
</main>
```

For most applications, prefer a component or disposable scope so the effect is cleaned up automatically rather than keeping a global disposer.

## Reactive state

### `reactive`, `effect`, and `stop`

`reactive` wraps an object in a Proxy and tracks property reads made by effects. Nested objects are made reactive when accessed. `effect` returns a stop function, while `stop(runner)` is available when the runner itself must be stopped explicitly.

```ts
import { reactive, effect, stop } from "onekit-js";

const state = reactive({
  count: 0,
  label: "Clicks",
});

const runner = effect(() => {
  console.log(`${state.label}: ${state.count}`);
});

state.count += 1;
stop(runner);
```

### `computed` and `watch`

Use `computed` for a lazy derived value and `watch` for side effects that need old and new values:

```ts
import { reactive, computed, effect, watch } from "onekit-js";

const cart = reactive({ price: 20, quantity: 2 });
const total = computed(() => cart.price * cart.quantity);

effect(() => console.log("Total:", total.value));

const stopWatching = watch(
  () => cart.quantity,
  (next, previous) => console.log({ next, previous }),
  { immediate: true },
);

cart.quantity = 3;
stopWatching();
```

### Batching, ticks, snapshots, and binding

Use `batch` when multiple mutations should flush together. Use `nextTick` after mutations when work must run after the reactive microtask. `snapshot` returns a safe deep clone, and `bind` connects a DOM property to reactive state.

```ts
import { reactive, batch, nextTick, snapshot, bind } from "onekit-js";

const state = reactive({ firstName: "Ada", lastName: "Lovelace" });

batch(() => {
  state.firstName = "Grace";
  state.lastName = "Hopper";
});

await nextTick();
console.log(snapshot(state));
bind("#name", state, "firstName", "value");
```

## Components

A component definition can declare props, local data, a template or render function, methods, and lifecycle hooks.

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
      <button data-on-increment type="button">Increment</button>
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
  // Later, when the root is removed:
  // unmount(instance);
}
```

Supported component lifecycle hooks include `beforeCreate`, `created`, `beforeMount`, `mounted`, `beforeUpdate`, `updated`, `beforeUnmount`, and `unmounted`. Composition-style helpers include `setupComponent`, `onMounted`, `onUpdated`, `onDestroyed`, and `onPropsChanged`.

Props may be declared using a type name or a definition object:

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

## Templates and directives

Compile a standalone template with `compileTemplate`, or place the template on a component definition:

```ts
import { compileTemplate } from "onekit-js";

const element = compileTemplate(
  `<button @click="increment">{{label}}</button>`,
  {
    label: "Add",
    increment: () => console.log("clicked"),
  },
);

document.querySelector("#app")?.appendChild(element);
```

Common V3 directive patterns are:

```html
<section ok-if="visible">
  <input ok-model="user.name" />
  <button ok-on:click="save($event)" type="button">Save</button>
  <ul>
    <li ok-for="item in items">{{item.name}}</li>
  </ul>
</section>
```

The template expression engine intentionally supports a restricted expression grammar. It does not execute arbitrary JavaScript statements or dynamic code. Interpolated text is connected to individual reactive text nodes, so changing one value does not require replacing the component root. Keep untrusted HTML and untrusted expression strings out of application templates, and validate external data before placing it in a UI model.

## JSX and VDOM

Use the JSX-compatible helpers or the lower-level VDOM helpers when explicit rendering and keyed updates are preferable:

```ts
import { h, render, Fragment } from "onekit-js";

const view = h(
  "main",
  { class: "shell" },
  h("h1", null, "OneKit"),
  h("p", null, "Small runtime, direct control."),
  h(Fragment, null, "More content"),
);

const root = document.querySelector("#app");
if (root) root.appendChild(render(view));
```

Public JSX/VDOM helpers include `h`, `jsx`, `jsxDEV`, `okjs`, `component`, `Fragment`, `createElement`, `render`, `patch`, and `vdomPatch`. Renderer updates support keyed children, prop removal, event replacement, style diffing, and refs.

## Routing

Create a router with static and dynamic paths, loaders, guards, redirects, and a selected navigation mode:

```ts
import { createRouter } from "onekit-js";

const appRouter = createRouter(
  [
    { path: "/", handler: () => { document.title = "Home"; } },
    {
      path: "/users/:id",
      loader: ({ to }) =>
        fetch(`/api/users/${to.params.id}`).then((response) => response.json()),
    },
    { path: "/login", beforeEnter: () => "/" },
  ],
  { mode: "history" },
);

await appRouter.start();
const match = await appRouter.navigate("/users/42?tab=posts");
console.log(match?.location.params.id, appRouter.getCurrentPath());

const unsubscribe = appRouter.subscribe((to, from) => {
  console.log("navigated", from?.fullPath, to.fullPath);
});

// Call unsubscribe() when the application scope is destroyed.
void unsubscribe;
```

The router resolves navigation and data but does not automatically render route components. Subscribe to route changes and connect the match to your component or VDOM renderer. Route loaders can use an error boundary so a failed loader returns controlled fallback data instead of crashing navigation:

```ts
const loaderBoundary = createErrorBoundary({
  fallback: (error) => ({ error: error.message, items: [] }),
});

const router = createRouter([
  { path: '/items', loader: () => fetchItems() },
], { mode: 'history', errorBoundary: loaderBoundary });
```

Call `router.stop()` when the router is no longer needed.

## Stores

Define a named store with state, actions, and optional getters. Retrieve it with `useStore`, inspect all stores with `getAllStores`, and remove it with `removeStore`.

```ts
import { defineStore, useStore } from "onekit-js";

const counter = defineStore("counter", () => ({
  state: { count: 0 },
  actions: {
    increment() {
      this.state.count += 1;
    },
  },
}));

const sameCounter = useStore<typeof counter>("counter");
sameCounter.increment();
```

Store subscriptions can be attached to a disposable scope. Store plugins can be registered with `addStorePlugin`. Do not put secrets in a client-side store; browser state is observable and mutable by the user.

## Disposable scopes and teardown

V3 provides an explicit disposable scope for effects, watchers, subscriptions, and other cleanup callbacks. This reduces teardown mistakes in components, route views, and feature modules.

```ts
import {
  effectScope,
  onScopeDispose,
  reactive,
  effect,
} from "onekit-js";

const scope = effectScope(true);

scope.run(() => {
  const state = reactive({ connected: false });
  const stop = effect(() => console.log(state.connected));
  const timer = setInterval(() => { state.connected = !state.connected; }, 1000);

  onScopeDispose(() => clearInterval(timer));
  onScopeDispose(stop);
});

// Stops the effect and clears the timer in reverse registration order.
scope.dispose();
```

Use `withScope` when a function should return both its value and its scope, or `registerDisposable` for resources exposing `dispose`, `stop`, or `unsubscribe`:

```ts
import { withScope, registerDisposable } from "onekit-js";

const result = withScope(() => {
  const subscription = registerDisposable(createSubscription());
  return subscription;
});

result.scope.dispose();
```

Component setup and mounted work are automatically associated with the component scope. Enable leak diagnostics only in development:

```ts
import { enableScopeLeakWarnings } from "onekit-js";

const disableWarnings = enableScopeLeakWarnings({
  thresholdMs: 60_000,
  onWarning: (scope) => console.warn("Long-lived scope", scope),
});

// Call when the development session ends.
disableWarnings();
```

## SSR and hydration

Render a VNode or string on the server with a request-scoped `SSRContext`:

```ts
import {
  createSSRContext,
  renderToString,
  addToHead,
  setMeta,
  renderTitle,
  h,
} from "onekit-js";

const context = createSSRContext();
addToHead(context, renderTitle("OneKit page"));
setMeta(context, "description", "A OneKit page");

const result = renderToString(
  h("main", null, "Rendered on the server"),
  context,
);

console.log(result.html);
```

On the client, hydrate the server DOM instead of rendering it a second time:

```ts
const hydration = hydrate(root, App());

if (hydration.mismatches.length > 0) {
  console.warn("OneKit hydration mismatch", hydration.mismatches);
}

// Call when the root is removed.
hydration.dispose();
```

Hydration reports tag, text, missing-node, and unexpected-node mismatches without silently hiding them. Use `isServer` and `isClient` to guard environment-specific code. Use request-scoped contexts for concurrent server requests; never store request data in a module-level singleton.

## Error and loading boundaries

Use error boundaries around component rendering, route loaders, or async data work:

```ts
import { createErrorBoundary, createLoadingBoundary, h } from "onekit-js";

const errors = createErrorBoundary({
  fallback: (error, reset) =>
    h("section", { class: "error" },
      h("p", null, `Could not render: ${error.message}`),
      h("button", { onclick: reset }, "Try again"),
    ),
});

const loading = createLoadingBoundary<string>();
const view = errors.render(() => renderPage(), "route-render");
await loading.run(() => fetchPage());
```

`createErrorBoundary` supports `run`, `runAsync`, `render`, `renderAsync`, `state.error`, and `reset`. `createLoadingBoundary` exposes `state.pending`, `run`, and `render(loading, ready)`. These are primitives; they do not replace an application router or renderer automatically.

## HTTP, storage, and accessibility

Use the fetch-based HTTP helpers at the application boundary:

```ts
import { get, post } from "onekit-js";

const response = await get("/api/items");
const created = await post("/api/items", { name: "Notebook" });
console.log(response.data, created.data);
```

Use namespaced storage wrappers for browser persistence:

```ts
import { localStorage, createStorage } from "onekit-js";

localStorage.set("theme", "light");
const theme = localStorage.get("theme");

const preferences = createStorage(window.localStorage, { prefix: "prefs_" });
preferences.set("density", "compact");
```

Use semantic HTML first and add accessibility helpers where they communicate behavior that HTML alone cannot express:

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
  const releaseFocus = trapFocus(dialog);
  announce("Dialog opened", "polite");
  void releaseFocus;
}

document.body.prepend(createSkipLink("#main"));
```

## Security

The security API includes `sanitizeHTML`, `sanitizeInput`, `sanitizeURL`, `validateJSON`, and `generateCSPHeader`:

```ts
import { sanitizeHTML, sanitizeURL, validateJSON } from "onekit-js";

const safeMarkup = sanitizeHTML(externalMarkup);
const safeURL = sanitizeURL(externalURL);
const parsed = validateJSON(externalJSON);
```

Treat external HTML, URLs, JSON, route parameters, storage values, and API responses as untrusted. Never interpolate secrets into browser bundles. The template evaluator is intentionally restricted, but untrusted template source should still be rejected at the application boundary. Use a Content Security Policy in production and keep dependency audits in CI.

## Plugins and dependency injection

Use the plugin manager for application-wide extensions and `DependencyInjector` or the singleton `di` for services:

```ts
import { pluginManager, di } from "onekit-js";

pluginManager.use({
  name: "logger",
  install() {
    console.log("logger installed");
  },
});

di.provide("apiBase", "https://api.example.com");
const apiBase = di.get("apiBase");
```

Define a clear ownership and teardown policy for services that open timers, sockets, event listeners, or subscriptions. Prefer registering those resources in the active disposable scope.

## Vite and HMR

Add the OneKit plugin to a Vite configuration:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { oneKitVitePlugin } from "onekit-js/vite";

export default defineConfig({
  plugins: [oneKitVitePlugin()],
});
```

The plugin emits OneKit module update events and preserves an application HMR state container when the module accepts an update:

```ts
import { preserveHMRState } from "onekit-js/vite";

const state = preserveHMRState("counter", { count: 0 });
state.count += 1;
```

HMR is a development feature. Always verify a clean production build and a fresh browser load; do not depend on HMR state preservation for application correctness.

## DevTools

DevTools are opt-in and safe for SSR when not installed as a browser global:

```ts
import { enableDevTools } from "onekit-js";

const bridge = enableDevTools({
  historySize: 200,
  installGlobal: true,
  globalName: "__ONEKIT_DEVTOOLS__",
});

const unsubscribe = bridge.subscribe((event) => {
  console.log(event.type, event);
});

console.table(bridge.getInspectors());
console.table(bridge.getHistory());

// On teardown:
unsubscribe();
bridge.dispose();
```

The current bridge provides reactive, router, component, store, scope, and resource lifecycle events plus live component/store inspector snapshots. Effects expose an inspectable resource graph and target/key dependency graph:

```ts
console.table(bridge.getResourceGraph());
console.table(bridge.getDependencyGraph());
```

This is a foundation for browser extension panels; do not ship sensitive application state to a remote debugging service.

## CLI commands

| Command | Purpose |
|---|---|
| `onekit create <name>` | Generate a Vite-compatible starter. |
| `onekit create <name> --javascript` | Generate a JavaScript starter. |
| `onekit dev` | Delegate to the project development script. |
| `onekit build` | Build the application and library output. |
| `onekit preview` | Preview an existing `dist` directory. |
| `onekit test` | Delegate to the project test script. |
| `onekit --help` | Display available commands. |

Use `--cwd <directory>` with delegated commands and place extra arguments after `--`.

## Testing and production verification

Run the application and library checks locally:

```bash
npm run type-check
npm test -- --runInBand
npm run build
npm run docs:build
npm run verify:package
npm audit --omit=dev
```

The package verification command creates a temporary project, packs the current package, installs the tarball, and verifies root, ESM, CJS, SSR, CLI, and `onekit-js/vite` entrypoints. Inspect package contents before publication:

```bash
npm pack --dry-run
```

The GitHub Actions workflow validates Node 18, 20, and 22, runs coverage thresholds, builds documentation, audits production dependencies, verifies the packed package, runs the repeatable benchmark, uploads its JSON report, and creates a release artifact for version tags.

Never commit `node_modules`, benchmark reports, access tokens, or generated temporary directories. Actual npm publication requires an authenticated npm session:

```bash
npm login
npm publish --access public
```

## Performance and benchmarking

Run the repeatable V3 baseline benchmark after building:

```bash
npm run benchmark
```

The benchmark writes a JSON report containing reactive updates, batched updates, deep snapshots, and scope teardown timings. CI runs it on Node 22 and uploads `benchmark-results/v3.json` as an artifact. Use the report to compare changes on the same Node version and machine. Do not compare results across different hardware or framework versions without recording the environment and methodology.

## TypeScript and package imports

OneKit exports declarations and supports tree-shakeable ESM usage. Prefer named imports:

```ts
import {
  reactive,
  computed,
  createRouter,
  defineStore,
} from "onekit-js";
```

The package provides CommonJS, ESM, UMD, declarations, the SSR subpath, and the Vite tooling subpath. Keep application code on public exports. If an API is not exported from `onekit-js`, treat it as internal rather than importing it from a source path.

## Troubleshooting

### The effect does not rerun

Make sure the effect actually reads the reactive property it should track. If a conditional branch changes, allow the effect to rerun so stale dependencies can be cleaned up. For DOM work that must occur after a batch, await `nextTick()`.

### A route changes but the page does not update

The router resolves navigation; it does not render components automatically. Subscribe to route changes and render the selected match through your component or VDOM layer. Dispose the subscription and stop the router when the route scope is removed.

### Hydration reports mismatches

Ensure server and client use the same initial data, stable keys, text content, and conditional branches. Do not access `window` or `document` during server rendering. Treat mismatch diagnostics as a bug to investigate rather than hiding them with a full client rerender.

### The Vite subpath cannot be imported

Run `npm run build` before packing or publishing. `npm run verify:package` performs this build automatically and validates `onekit-js/vite` from the packed tarball.

### A scope warning appears

A scope remains active with pending cleanup callbacks beyond the configured threshold. Ensure the owning component, route, socket, timer, watcher, or subscription calls `dispose`, `stop`, or `unsubscribe`, or register the resource with `registerDisposable` inside the active scope.

### Node 18 behaves differently during minification

OneKit's CI build keeps Node 18 portable by skipping incompatible terser minification only for that runtime. Release builds on Node 20+ generate optimized minified artifacts. Always use the full production build on the release environment.

## Documentation and release resources

| Resource | Contents |
|---|---|
| [V3 Usage Guide](docs/V3_USAGE.md) | Complete API signatures and runnable feature examples. |
| [V3 Migration Guide](MIGRATION_GUIDE.md) | Before/after migration manual with complete application examples. |
| [Getting Started](docs/GETTING_STARTED.md) | First project workflow. |
| [Framework Guide](docs/FRAMEWORK_GUIDE.md) | Architecture and framework conventions. |
| [Production Readiness](docs/PRODUCTION_READINESS.md) | Adoption guidance and release checklist. |
| [Changelog](CHANGELOG.md) | Release history and maintenance notes. |
| [Counter example](examples/counter) | Minimal reactive application. |
| [Todo example](examples/todo) | Store-backed application. |
| [V3.1.13 Release](https://github.com/hidecard/onekit-js/releases/tag/v3.1.13) | Current GitHub release. |

## License

MIT © OneKit contributors
