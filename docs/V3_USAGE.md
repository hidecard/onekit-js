# OneKit JS V3 Usage Guide

**Target release:** OneKit JS V3 / 3.1.12  
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

The create command generates a Vite-compatible TypeScript starter by default. Use `--javascript` or `--template js` for a JavaScript starter. The build command detects a TypeScript or JavaScript application entrypoint and emits a production bundle. `onekit dev` delegates to the project `dev` script, `onekit preview` requires a `dist` directory and delegates to the `preview` script, and `onekit test` delegates to the project `test` script while preserving the child process exit code. Use `--cwd <directory>` to run commands from another project and pass additional arguments after the command.

```bash
onekit dev --cwd ./my-app -- --host 0.0.0.0
onekit preview --cwd ./my-app -- --port 4173
onekit test --cwd ./my-app -- --watch
```

Use `onekit --help` after a global install, or `npx --yes --package=onekit-js onekit --help` without a global install.

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

Keep untrusted HTML out of templates. OneKit sanitizes component HTML, but applications should still validate external content before putting it into a UI model.

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

The router resolves navigation and data but does not automatically render route components. Applications should subscribe to matches and connect them to their renderer or component layer. Stop a router with `router.stop()` when its application scope is destroyed.

## 8. Stores and plugins

### Stores

Define a named store with `state`, actions, and optional getters according to the store definition used by the project. Retrieve it with `useStore`, inspect all stores with `getAllStores`, and remove it with `removeStore`.

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

If the application uses a definition object rather than a setup callback, pass the object directly to `defineStore` or `createStore`.

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

Use `hydrate(rootElement, vnode)` on the client when the server-rendered DOM should be connected to the client view. Hydration returns `{ mismatches, dispose }`: `mismatches` reports tag, text, missing-node, and unexpected-node parity failures without rewriting the server DOM, while `dispose()` removes listeners attached by hydration. `isServer` and `isClient` help guard environment-specific code. `withCache` can cache repeated SSR render work when its cache key and lifecycle are controlled by the application.

```ts
const hydration = hydrate(root, App());
if (hydration.mismatches.length > 0) {
  console.warn("OneKit hydration mismatch", hydration.mismatches);
}
// Call hydration.dispose() when the root is removed.
```

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

## 16. Experimental DevTools foundation

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

The current experimental events are `reactive:trigger`, `reactive:effect`, and `router:navigation`. Reactive events expose stable numeric target/effect identifiers rather than private proxy objects. Router events report `start`, `success`, `cancel`, or `error` phases with destination, origin, route, and loader error metadata where available. Event listeners are isolated: an exception inside a DevTools listener is ignored and cannot break the application.

The bridge stores a bounded, detached event history for diagnostics. Use `getHistory()` to inspect recent events, `getMetadata()` to inspect the active history size and listener count, and `clearHistory()` to reset the buffer:

```ts
const recent = bridge.getHistory();
const metadata = bridge.getMetadata();
bridge.clearHistory();
```

For browser-only tooling, pass `installGlobal: true` and an optional `globalName`. OneKit installs the bridge on `window` only when a browser `window` exists; it does not create or mutate browser globals during SSR. The default history capacity is 100 events and can be lowered to limit diagnostic memory use.

This API is **experimental**. Event names and payload fields may change before a stable DevTools release. Do not use it as an application data bus, and do not enable it in production unless the diagnostic overhead and information exposure have been reviewed. Event payloads can include changed values and loader errors, so avoid enabling it where those values would violate privacy or security requirements.

## 17. Versioning and migration

V3 is the framework-grade API line. The most important V3 additions are `defineComponent`, `unmount`, `nextTick`, expanded public exports, CLI project generation/building, SSR helpers, stores, templates, JSX, and Web Components.

When migrating an older project, first replace internal module imports with public root imports, then run type-check and the regression suite. Replace manual component-definition identity wrappers with `defineComponent`, use `unmount` for teardown, and use `nextTick` when DOM assertions must wait for the reactive microtask.

Keep the package version, `VERSION` constant, README, CHANGELOG, examples, and website banner synchronized before publishing.

## 18. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Component "X" not found` | The component was not registered or the name differs | Call `register("X", definition)` before `create` or `mount`. |
| `Invalid target element` | The selector did not resolve | Ensure the target exists before mounting and run after DOM creation. |
| State changes but the DOM does not update | No effect is subscribed, or a component was mutated without `update()` | Use `effect`, or call the component instance's `update()` after a method mutation. |
| SSR output differs from browser output | Browser-only APIs run during server rendering | Guard with `isClient()` and keep SSR context request-scoped. |
| CLI build cannot find an entrypoint | The project uses a non-standard source filename | Add the expected `src/main.ts`, `src/main.tsx`, `src/index.ts`, or `src/index.js` entrypoint. |
| User HTML appears unsafe | External markup was rendered directly | Sanitize it and keep untrusted content out of executable attributes. |
| Focus escapes a modal | Focus trap was not released or the container is not mounted | Call `trapFocus` after mount and invoke the returned cleanup function on teardown. |

## 19. Release verification

Run the complete release checks from the repository root:

```bash
npm run type-check
npm test -- --runInBand
npm run build
npm run verify:package
npm audit --omit=dev
npm pack --dry-run
```

`npm run verify:package` creates an isolated temporary project, installs the packed tarball, and checks the root, ESM, CJS, SSR, and CLI entrypoints. Then inspect the tarball contents and verify that the package version, declaration paths, CLI files, README, documentation, and license are present. Pull requests and pushes to the `V3` branch also run the same checks through GitHub Actions. Actual publication requires an authenticated npm session:

```bash
npm login
npm publish --access public
```

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
