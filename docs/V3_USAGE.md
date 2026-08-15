# OneKit JS V3 Usage Guide

**Target release:** OneKit JS V3 / 3.1.9  
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
npx onekit create my-app
cd my-app
npm install
npm run dev
```

Create accepts relative or absolute target paths. The generated project contains a Vite entrypoint, TypeScript source, `vite.config.ts`, and a starter component. Build the application with:

```bash
npx onekit build
```

The build command detects a TypeScript or JavaScript application entrypoint and emits a production bundle. Use `npx onekit --help` to inspect the available commands.

## 3. Reactive state

### `reactive`

`reactive` wraps an object in a Proxy and tracks reads made by effects. Nested objects are wrapped when accessed.

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

`watch` observes a property name, a getter, or an object. The callback receives the new and previous values. Use `immediate` for an initial callback and `deep` when traversing nested objects.

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

The JSX-compatible helpers are `h`, `jsx`, `jsxDEV`, `okjs`, `component`, and `Fragment`. The VDOM helpers are `createElement`, `render`, and `vdomPatch`.

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

The router is intentionally small. Add route records with a `path` and optional `component` or `handler`, navigate by path, and read the current browser pathname.

```ts
import { router } from "onekit-js";

router.addRoute({
  path: "/about",
  handler: () => {
    document.title = "About";
  },
});

router.navigate("/about");
console.log(router.getCurrentPath());
```

The V3 router does not provide nested route matching, loaders, guards, or history-based rendering. Applications that need those concerns should compose them around the exported router or use a dedicated router package.

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

Use `hydrate(rootElement, vnode)` on the client when the server-rendered DOM should be connected to the client view. `isServer` and `isClient` help guard environment-specific code. `withCache` can cache repeated SSR render work when its cache key and lifecycle are controlled by the application.

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

## 16. Versioning and migration

V3 is the framework-grade API line. The most important V3 additions are `defineComponent`, `unmount`, `nextTick`, expanded public exports, CLI project generation/building, SSR helpers, stores, templates, JSX, and Web Components.

When migrating an older project, first replace internal module imports with public root imports, then run type-check and the regression suite. Replace manual component-definition identity wrappers with `defineComponent`, use `unmount` for teardown, and use `nextTick` when DOM assertions must wait for the reactive microtask.

Keep the package version, `VERSION` constant, README, CHANGELOG, examples, and website banner synchronized before publishing.

## 17. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Component "X" not found` | The component was not registered or the name differs | Call `register("X", definition)` before `create` or `mount`. |
| `Invalid target element` | The selector did not resolve | Ensure the target exists before mounting and run after DOM creation. |
| State changes but the DOM does not update | No effect is subscribed, or a component was mutated without `update()` | Use `effect`, or call the component instance's `update()` after a method mutation. |
| SSR output differs from browser output | Browser-only APIs run during server rendering | Guard with `isClient()` and keep SSR context request-scoped. |
| CLI build cannot find an entrypoint | The project uses a non-standard source filename | Add the expected `src/main.ts`, `src/main.tsx`, `src/index.ts`, or `src/index.js` entrypoint. |
| User HTML appears unsafe | External markup was rendered directly | Sanitize it and keep untrusted content out of executable attributes. |
| Focus escapes a modal | Focus trap was not released or the container is not mounted | Call `trapFocus` after mount and invoke the returned cleanup function on teardown. |

## 18. Release verification

Run the complete release checks from the repository root:

```bash
npm run type-check
npm test -- --runInBand
npm run build
npm pack --dry-run
```

Then inspect the tarball contents and verify that the package version, declaration paths, CLI files, README, documentation, and license are present. Actual publication requires an authenticated npm session:

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
