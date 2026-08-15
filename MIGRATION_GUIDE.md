# OneKit JS V3 Migration Guide

**Target release:** OneKit JS V3 / `3.1.12`
**Package:** `onekit-js`
**Runtime:** Browser-first JavaScript and TypeScript
**Audience:** OneKit 2.x or legacy single-file users moving to V3, and teams adopting V3 in a new application

> This guide explains the migration decisions that matter in a real application: package installation, imports, state, components, templates, routing, stores, SSR, CLI workflows, testing, security, and release verification.

## 1. Migration at a glance

OneKit V3 is a modular, TypeScript-first framework. The package is distributed as `onekit-js`, exposes a named public API from the root entry point, ships ESM/CJS/UMD builds and declarations, and includes a CLI named `onekit`.

The most important migration principle is to replace implicit global access with explicit imports and explicit application lifecycle management. A V3 application should own its reactive effects, router subscriptions, component instances, event listeners, and SSR request context. Every long-lived resource should have a corresponding teardown path.

| Legacy approach | V3 approach |
|---|---|
| Load one global script and use a global runtime object | Install `onekit-js` and use named imports |
| Keep application state in an untracked object | Use `reactive`, `computed`, `effect`, `watch`, or a named store |
| Mutate the DOM from unrelated callbacks | Keep DOM updates inside effects, components, or the VDOM renderer |
| Treat the router as a renderer | Let the router resolve navigation/data and connect matches to your renderer or components |
| Use one global store for every concern | Use `defineStore` for named, scoped application stores |
| Render untrusted HTML directly | Validate external data, use sanitization helpers, and keep untrusted values out of executable template expressions |
| Publish after a local build only | Run type-check, tests, build, clean-install verification, package dry-run, and production audit |

## 2. Before you migrate

Create a branch for the migration and record the current application behavior. At minimum, capture the routes that must remain reachable, the state transitions that users depend on, the SSR output if applicable, the CLI commands used in development and deployment, and the browser support assumptions.

Do not begin by changing every file at once. First introduce V3 as a dependency, create one explicit entrypoint, and migrate one isolated feature. This makes it possible to distinguish API incompatibilities from unrelated application changes.

Run the following commands before changing application code so that the baseline is known:

```bash
npm test
npm run build
```

If the legacy application does not have automated tests, add smoke tests for startup, one state update, one route transition, one form submission, and one production build before starting the migration.

## 3. Installation and package identity

Install the V3 package with the package name `onekit-js`. No separate `@types` package is required because declarations are included in the package.

```bash
npm install onekit-js
```

For a TypeScript project:

```ts
import { effect, mount, reactive } from "onekit-js";

const state = reactive({ count: 0 });

effect(() => {
  const element = document.querySelector("#count");
  if (element) element.textContent = String(state.count);
});

void mount;
```

The executable name is `onekit`, not `onekit-js`:

```bash
npx --yes --package=onekit-js onekit --help
```

The supported package entrypoints are the root package and the documented feature subpaths. Prefer the root package for application code unless a build system or library distribution specifically requires a subpath.

```ts
import { reactive, effect } from "onekit-js";
import { renderToString } from "onekit-js/ssr";
import { createRouter } from "onekit-js/router";
```

Do not import private files such as `onekit-js/src/...` from an application. Private source paths are not compatibility contracts.

## 4. Replace global access with named imports

### Legacy pattern

A legacy application may have loaded a browser script and expected a global object:

```html
<script src="/vendor/onekit.js"></script>
<script>
  ok("#save").click(save);
</script>
```

### V3 pattern

In V3, import the API explicitly and use the public package entrypoint:

```ts
import { createElement, render } from "onekit-js";

const button = createElement("button", { onClick: save }, "Save");
const root = document.querySelector("#app");
if (root) root.appendChild(render(button));

function save() {
  console.log("saved");
}
```

The UMD build remains available for environments that require a browser bundle, but application code should prefer ESM through the package import. Avoid assuming that a global `ok` object exists after installing the npm package.

## 5. Update the application entrypoint

A V3 application should have one clear browser entrypoint. A minimal Vite-style entrypoint looks like this:

```ts
import { effect, reactive } from "onekit-js";
import "./style.css";

const state = reactive({ count: 0 });

effect(() => {
  const output = document.querySelector("#count");
  if (output) output.textContent = String(state.count);
});

document.querySelector("#increment")?.addEventListener("click", () => {
  state.count += 1;
});
```

The corresponding HTML can remain ordinary HTML:

```html
<div id="app">
  <span id="count">0</span>
  <button id="increment" type="button">Increment</button>
</div>
```

For a new project, the included CLI can generate a Vite-compatible starter:

```bash
npx --yes --package=onekit-js onekit create my-app
cd my-app
npm install
npm run dev
```

Use `--javascript` or `--template js` when a JavaScript starter is preferred. The generated project includes the expected source entrypoint, Vite configuration, TypeScript configuration where applicable, and standard development scripts.

## 6. Reactive state migration

### 6.1 Replace untracked state with `reactive`

The V3 reactive contract is based on property reads and writes. Wrap the object that should participate in tracking:

```ts
import { effect, reactive } from "onekit-js";

const state = reactive({
  user: { name: "Ada" },
  count: 0,
});

effect(() => {
  const output = document.querySelector("#summary");
  if (output) output.textContent = `${state.user.name}: ${state.count}`;
});

state.user.name = "Grace";
state.count += 1;
```

Do not replace the reactive proxy with a plain clone and expect existing effects to continue tracking it. Use `snapshot` when a plain deep value is required for serialization or logging.

### 6.2 Effects must be stopped

`effect` returns a runner. Keep it when the effect belongs to a component, route, modal, or other finite scope:

```ts
import { effect, stop } from "onekit-js";

const runner = effect(() => {
  console.log(state.count);
});

// During teardown:
stop(runner);
```

An effect that survives the component or route that created it can retain DOM nodes and application state. Treat effect cleanup as part of the migration, not as an optional optimization.

### 6.3 Computed values and watchers

Use `computed` for derived state and read its `.value` property:

```ts
import { computed, effect, reactive } from "onekit-js";

const cart = reactive({ price: 20, quantity: 2 });
const total = computed(() => cart.price * cart.quantity);

effect(() => {
  console.log(`Total: ${total.value}`);
});
```

Use `watch` when the application needs a callback with previous and next values. The returned function is the disposer:

```ts
import { watch } from "onekit-js";

const dispose = watch(
  () => state.user.name,
  (next, previous) => {
    console.log({ next, previous });
  },
  { immediate: true },
);

dispose();
```

### 6.4 Batching and post-update work

Use `batch` when several mutations represent one user-visible transition. Use `nextTick` when code must run after the reactive microtask:

```ts
import { batch, nextTick } from "onekit-js";

batch(() => {
  state.count = 10;
  state.user.name = "Updated";
});

await nextTick();
const element = document.querySelector("#summary");
```

## 7. Component migration

### 7.1 Define, register, create, and mount

V3 components are definitions plus explicit instances. A typical migration separates component definition from registration and mounting:

```ts
import {
  create,
  defineComponent,
  mount,
  register,
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
});

register("Counter", Counter);
const instance = create("Counter", { step: 2 });
if (instance) {
  mount(instance, "#app");
  // Later, when the owning scope is destroyed:
  // unmount(instance);
}
```

`defineComponent` is an identity helper for readable definitions. `register` creates a named definition. `create` returns an instance or `null` for an unknown name. `mount` accepts an instance or registered name and a selector, `Element`, or `ShadowRoot`. `unmount` is the teardown alias.

### 7.2 Props and local state

Declare props explicitly. V3 supports the type names `string`, `number`, `boolean`, `object`, `array`, `function`, and `symbol`, plus `required`, `default`, and `validator` options:

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

Use `data: () => ({ ... })` for per-instance local state. Avoid putting mutable instance state in a shared object literal.

### 7.3 Lifecycle and teardown

V3 definitions support `beforeCreate`, `created`, `beforeMount`, `mounted`, `beforeUpdate`, `updated`, `beforeUnmount`, and `unmounted`. Composition-style helpers include `setupComponent`, `onMounted`, `onUpdated`, `onDestroyed`, and `onPropsChanged`.

Every migration should map legacy cleanup code to `beforeUnmount`/`unmounted` or the composition teardown hook. Dispose effects, router subscriptions, event listeners, timers, observers, and pending application-owned resources there.

## 8. Template and directive migration

V3 template compilation uses OneKit directive attributes. Use the `ok-*` syntax supported by the template engine rather than assuming Vue-style or legacy shorthand syntax will be recognized.

```ts
import { compileTemplate } from "onekit-js";

const state = {
  label: "Add",
  user: { name: "Ada" },
  increment() {
    console.log("clicked");
  },
};

const element = compileTemplate(
  `
    <section>
      <button ok-on.click="increment()">{{label}}</button>
      <input ok-model="user.name" />
      <p ok-if="user.name">{{user.name}}</p>
    </section>
  `,
  state,
);

document.querySelector("#app")?.appendChild(element);
```

The primary built-in directives are:

| Directive | Purpose | Example |
|---|---|---|
| `ok-if` | Show or hide an element based on an expression | `ok-if="visible"` |
| `ok-show` | Toggle `display` while retaining the element | `ok-show="isOpen"` |
| `ok-for` | Render items from an array | `ok-for="item, index in items"` |
| `ok-bind` | Bind a value, class, style, or attribute | `ok-bind.class="className"` |
| `ok-model` | Two-way bind a form control to a property path | `ok-model="form.email"` |
| `ok-on` | Attach an event handler | `ok-on.click.prevent="submit()"` |

Event expressions receive the DOM event as `$event`:

```html
<button ok-on.click="select($event)">Select</button>
```

Template expressions are intended for trusted application templates. External HTML and external expressions must not be treated as safe merely because HTML sanitization is enabled. Validate external data, avoid executable expressions from remote content, and configure a restrictive Content Security Policy.

If the application uses custom directives, register them explicitly:

```ts
import { registerDirective } from "onekit-js";

registerDirective("focus", {
  bind({ element }) {
    (element as HTMLElement).focus();
  },
});
```

## 9. JSX and VDOM migration

For JSX/VDOM code, use the public helpers `h`, `jsx`, `jsxDEV`, `okjs`, `component`, `Fragment`, `createElement`, `render`, and `patch`:

```ts
import { Fragment, h, render } from "onekit-js";

const view = h(
  "main",
  { class: "shell" },
  h("h1", null, "OneKit V3"),
  h(Fragment, null, h("p", null, "Migrated successfully.")),
);

const root = document.querySelector("#app");
if (root) root.appendChild(render(view));
```

The V3 renderer supports keyed children, prop removal, event replacement, style updates, and refs. When migrating a list, provide stable keys rather than array indexes when item identity matters:

```ts
const rows = items.map((item) =>
  h("li", { key: item.id }, item.label),
);
```

Use `patch(parent, nextVNode, previousVNode)` when the application owns an existing VDOM lifecycle. Use `render` for the initial DOM node.

## 10. Router migration

The V3 router is created with `createRouter`. It resolves routes, params, queries, guards, redirects, loaders, and navigation state. It does **not** automatically render a route component; the application connects the matched result to its renderer or component layer.

```ts
import { createRouter } from "onekit-js";

const appRouter = createRouter(
  [
    { path: "/", handler: () => renderHome() },
    {
      path: "/users/:id",
      loader: ({ to }) =>
        fetch(`/api/users/${to.params.id}`).then((response) => response.json()),
    },
    { path: "/login", beforeEnter: () => "/" },
  ],
  { mode: "history" },
);

const unsubscribe = appRouter.subscribe((to, from) => {
  renderRoute(to);
});

await appRouter.start();
await appRouter.navigate("/users/42?tab=posts");

// During application teardown:
unsubscribe();
appRouter.stop();
```

Use `mode: "memory"` for tests and non-browser environments. Use `history` or `hash` according to the deployment server's fallback configuration. If history mode is used, configure the server to return the application entrypoint for client-side routes.

## 11. Store migration

Use `defineStore` for named application state that is shared across features. Keep local component state in `data` or a component-owned reactive object; do not turn every local value into a global store.

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

A definition object can be passed directly to `defineStore` or `createStore` when that matches the existing application architecture. Use `getAllStores` for diagnostics and `removeStore` when a store belongs to a finite scope.

Do not keep user-specific or request-specific state in a module-level singleton during SSR. Create request-scoped state and pass it through the request context.

## 12. SSR and hydration migration

Use `renderToString` with a request-scoped context. Do not share a mutable SSR context between requests:

```ts
import {
  addToHead,
  createSSRContext,
  h,
  renderTitle,
  renderToString,
} from "onekit-js";

export function renderPage() {
  const context = createSSRContext();
  addToHead(context, renderTitle("OneKit V3"));

  return renderToString(
    h("html", {},
      h("head"),
      h("body", {}, h("main", {}, "Hello from SSR")),
    ),
    context,
  );
}
```

On the client, hydrate the server DOM and retain the returned result so that event listeners can be disposed:

```ts
import { h, hydrate } from "onekit-js";

const root = document.querySelector("#app");
if (root) {
  const hydration = hydrate(root, h("main", {}, "Hello from SSR"));
  if (hydration.mismatches.length) {
    console.warn("Hydration mismatch", hydration.mismatches);
  }

  // During teardown:
  // hydration.dispose();
}
```

Hydration reports tag and text mismatches without rewriting the server DOM incorrectly. Browser-only APIs must be guarded with `isClient()` or an equivalent environment check. Do not access `window`, `document`, or browser storage while producing server output.

## 13. HTTP, storage, security, and browser utilities

The HTTP helpers are named exports:

```ts
import { get, post } from "onekit-js";

const users = await get("/api/users");
await post("/api/users", { name: "Ada" });
```

For storage, use the namespaced instances or `createStorage`:

```ts
import { localStorage, sessionStorage } from "onekit-js";

localStorage.set("preferences", { theme: "dark" });
const preferences = localStorage.get("preferences");
sessionStorage.set("session-id", "abc");
```

Use the security helpers when the application accepts external values:

```ts
import {
  generateCSPHeader,
  sanitizeHTML,
  sanitizeURL,
  validateJSON,
} from "onekit-js";

const safeMarkup = sanitizeHTML(externalMarkup);
const safeLink = sanitizeURL(externalURL);
const validPayload = validateJSON(rawJSON);
const csp = generateCSPHeader();
```

Sanitization is not a replacement for authorization, schema validation, output encoding, or a server-side Content Security Policy. Keep `enableSanitization` and `enableValidation` enabled unless there is a documented, tested reason to change them.

## 14. TypeScript migration

V3 ships declarations. Remove obsolete third-party type packages for OneKit if they were installed only to describe the legacy global object. Import types and runtime values from the public package:

```ts
import type { ComponentDefinition, Route } from "onekit-js";
import { createRouter, defineComponent } from "onekit-js";

const routes: Route[] = [{ path: "/" }];
const router = createRouter(routes, { mode: "memory" });
const Page = defineComponent({ name: "Page", template: "<main>Page</main>" });
void router;
void Page;
```

Enable strict TypeScript checking during migration where possible. V3 code is easier to maintain when component props, route records, store state, loader results, and DOM references have explicit types.

## 15. CLI and build migration

The V3 CLI commands are project-oriented:

```bash
onekit create my-app
onekit dev
onekit build
onekit preview
onekit test
```

Commands can run against another project and accept delegated arguments:

```bash
onekit dev --cwd ./my-app -- --host 0.0.0.0
onekit preview --cwd ./my-app -- --port 4173
onekit test --cwd ./my-app -- --watch
```

The application build command expects a conventional source entrypoint such as `src/main.ts`, `src/main.tsx`, `src/index.ts`, or `src/index.js`. If a legacy project uses a different entrypoint, either rename it or configure a project-specific build flow before migrating the CLI command.

The library repository itself uses these release checks:

```bash
npm ci
npm run type-check
npm test -- --runInBand
npm run build
npm run docs:build
npm run verify:package
npm audit --omit=dev
npm pack --dry-run
```

`verify:package` packs the library, installs that tarball into a temporary clean project, and checks root, ESM, CJS, SSR, and CLI entrypoints. Treat this as a required migration gate for a published application integration.

## 16. Package formats and bundler notes

The package exposes the following main distribution fields:

| Field | Use |
|---|---|
| `main` | CommonJS consumers |
| `module` | ESM-aware bundlers |
| `browser` | Browser-oriented bundlers/UMD consumers |
| `types` | TypeScript declarations |
| `bin.onekit` | CLI executable |

Do not import `dist` files by hand in ordinary application code. Let the bundler resolve the package exports. If a legacy browser page cannot use a bundler, load the UMD build intentionally and test the resulting global contract in that deployment environment.

## 17. Common incompatibilities and their fixes

### The package cannot be found

Check that the dependency is named `onekit-js`, not `onekit`, and that the import uses the same package name:

```bash
npm install onekit-js
```

```ts
import { reactive } from "onekit-js";
```

### A global `ok` object is undefined

This is expected when moving to the module-based V3 workflow. Replace global access with named imports. If a legacy page must remain script-based temporarily, use the explicitly selected UMD build and plan a module migration.

### A directive does not run

Check that the attribute uses the V3 `ok-*` form, for example `ok-on.click`, `ok-if`, `ok-model`, or `ok-bind.class`. Verify that the expression uses a property available in the context passed to `compileTemplate`, and remember to use `$event` for the DOM event.

### A template expression is rejected

V3 rejects known dangerous globals and statement patterns. Do not place remote or user-authored JavaScript expressions in templates. Move application logic into named functions and pass only trusted references in the template context.

### Route navigation succeeds but the page does not change

The router resolves a match; it does not render route components automatically. Subscribe to the router, render the matched route in the callback, and dispose the subscription when the application scope ends.

### Hydration reports mismatches

Compare server and client data, route, locale, feature flags, and generated attributes. Keep request context isolated, avoid browser-only reads during SSR, and inspect `result.mismatches` before changing the server DOM.

### The CLI cannot find the application entrypoint

Use one of the supported entrypoint names or run the command from the correct project directory with `--cwd`. Verify that the project has the expected `dev`, `build`, `preview`, and `test` scripts.

### An effect continues after a component is removed

Store the effect runner and call `stop(runner)`. Also remove router subscriptions, DOM listeners, timers, observers, and any custom directive cleanup during component teardown.

## 18. Incremental migration plan

For a large application, use the following sequence:

1. Install `onekit-js` and add a V3 entrypoint without removing the legacy entrypoint.
2. Migrate one leaf feature to named imports and `reactive` state.
3. Migrate one component and its teardown path.
4. Migrate one route in memory mode, then enable browser history/hash mode.
5. Migrate shared state to a named store only where sharing is required.
6. Add SSR/hydration checks if the application renders on the server.
7. Replace legacy CLI commands with `onekit dev`, `onekit build`, `onekit preview`, and `onekit test`.
8. Remove the legacy global bundle only after production smoke tests pass.
9. Run the clean-install and package verification commands before publishing.

Keep each step reviewable. Avoid mixing a framework migration with a major product feature or a broad visual redesign in the same change set.

## 19. Final migration checklist

### Dependency and imports

- [ ] `package.json` uses `onekit-js` at the intended V3 version.
- [ ] Legacy global imports are replaced with named public imports.
- [ ] Private `src` imports and obsolete type packages are removed.
- [ ] Browser-only code is isolated from SSR execution.

### Runtime and state

- [ ] Application state uses `reactive`, stores, or explicit component state.
- [ ] Effects and watchers have teardown functions.
- [ ] `batch` and `nextTick` are used where update ordering matters.
- [ ] Router subscriptions and router instances are disposed.

### Components and templates

- [ ] Components use `defineComponent`, `register`, `create`, `mount`, and `unmount` as appropriate.
- [ ] Props have types/defaults/validators where needed.
- [ ] Directives use the supported `ok-*` syntax.
- [ ] External HTML and template expressions are treated as untrusted.

### SSR and delivery

- [ ] SSR uses a request-scoped context.
- [ ] Hydration mismatch results are inspected in development.
- [ ] The application server is configured for history-mode fallback if required.
- [ ] CLI build/dev/preview/test commands work from a clean project.
- [ ] `npm run type-check`, tests, build, docs build, package verification, audit, and pack dry-run pass.

## 21. Complete V3 application example

The following small application demonstrates the recommended migration shape. It uses a reactive state object, a component-like render function, explicit cleanup, and ordinary DOM APIs. It does not depend on a global runtime object.

### 21.1 Project files

```text
my-app/
├── index.html
├── package.json
└── src/
    ├── main.ts
    └── style.css
```

### 21.2 `package.json`

```json
{
  "name": "my-onekit-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "onekit-js": "^3.1.12"
  },
  "devDependencies": {
    "vite": "latest",
    "typescript": "latest",
    "jest": "latest",
    "ts-jest": "latest",
    "jest-environment-jsdom": "latest"
  }
}
```

Pin exact versions in a production application according to the team's dependency policy. The important migration detail is that the runtime package is `onekit-js` while the executable is `onekit`.

### 21.3 `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OneKit V3 application</title>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### 21.4 `src/main.ts`

```ts
import { batch, effect, nextTick, reactive } from "onekit-js";
import "./style.css";

type Todo = {
  id: number;
  title: string;
  done: boolean;
};

const state = reactive({
  draft: "",
  filter: "all" as "all" | "active" | "done",
  nextId: 3,
  todos: [
    { id: 1, title: "Install OneKit V3", done: true },
    { id: 2, title: "Migrate the first feature", done: false },
  ] as Todo[],
});

const app = document.querySelector<HTMLMainElement>("#app");
if (!app) throw new Error("#app was not found");

function visibleTodos(): Todo[] {
  if (state.filter === "active") return state.todos.filter((todo) => !todo.done);
  if (state.filter === "done") return state.todos.filter((todo) => todo.done);
  return state.todos;
}

function render() {
  const todos = visibleTodos();
  app.innerHTML = `
    <section class="todo-app">
      <h1>OneKit V3 migration demo</h1>
      <form id="todo-form">
        <input id="todo-draft" value="${escapeHtml(state.draft)}" placeholder="Add a task" />
        <button type="submit">Add</button>
      </form>
      <nav aria-label="Todo filter">
        <button data-filter="all">All</button>
        <button data-filter="active">Active</button>
        <button data-filter="done">Done</button>
      </nav>
      <ul>
        ${todos.map((todo) => `
          <li data-id="${todo.id}">
            <label>
              <input type="checkbox" data-toggle ${todo.done ? "checked" : ""} />
              <span>${escapeHtml(todo.title)}</span>
            </label>
            <button type="button" data-remove>Remove</button>
          </li>
        `).join("")}
      </ul>
      <p>${todos.length} visible task(s)</p>
    </section>
  `;
  bindEvents();
}

function bindEvents() {
  app.querySelector<HTMLFormElement>("#todo-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = app.querySelector<HTMLInputElement>("#todo-draft");
    const title = input?.value.trim() ?? "";
    if (!title) return;

    batch(() => {
      state.todos.push({ id: state.nextId++, title, done: false });
      state.draft = "";
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter as typeof state.filter;
    });
  });

  app.querySelectorAll<HTMLInputElement>("[data-toggle]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = Number(input.closest("li")?.dataset.id);
      const todo = state.todos.find((item) => item.id === id);
      if (todo) todo.done = input.checked;
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.closest("li")?.dataset.id);
      const index = state.todos.findIndex((item) => item.id === id);
      if (index >= 0) state.todos.splice(index, 1);
    });
  });
}

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

const stopRendering = effect(render);

// An application shell can use nextTick after a batch when it must measure DOM.
void nextTick(() => {
  document.querySelector<HTMLInputElement>("#todo-draft")?.focus();
});

// Export a teardown function if this module is mounted by a larger host app.
export function disposeApp() {
  stopRendering();
  app.replaceChildren();
}
```

This example deliberately escapes interpolated values before assigning `innerHTML`. Sanitization and escaping are still application responsibilities when using raw DOM strings. For a larger application, prefer VDOM or component rendering when that better expresses the update lifecycle.

## 22. Before and after migration patterns

### 22.1 Global script to explicit module

**Before:**

```html
<script src="/vendor/onekit.js"></script>
<script>
  ok("#counter").text("0");
  ok("#increment").click(function () {
    ok("#counter").text(Number(ok("#counter").text()) + 1);
  });
</script>
```

**After:**

```ts
import { effect, reactive } from "onekit-js";

const state = reactive({ count: 0 });

effect(() => {
  document.querySelector("#counter")!.textContent = String(state.count);
});

document.querySelector("#increment")?.addEventListener("click", () => {
  state.count += 1;
});
```

The after version makes the state owner explicit, allows TypeScript to check the code, and gives the effect a handle that can be stopped during teardown.

### 22.2 Untracked object to reactive state

**Before:**

```ts
const state = { count: 0 };

function increment() {
  state.count += 1;
  renderCounter(state);
}
```

**After:**

```ts
import { effect, reactive } from "onekit-js";

const state = reactive({ count: 0 });

effect(() => renderCounter(state.count));

function increment() {
  state.count += 1;
}
```

Do not call `reactive` repeatedly for the same object in unrelated modules. Create the owner once and pass the reactive object to consumers, or expose a store API.

### 22.3 Legacy manual watcher to `watch`

**Before:**

```ts
let previous = state.query;

setInterval(() => {
  if (state.query !== previous) {
    search(state.query, previous);
    previous = state.query;
  }
}, 100);
```

**After:**

```ts
import { watch } from "onekit-js";

const stopSearchWatch = watch(
  () => state.query,
  (query, previous) => search(query, previous),
  { immediate: true },
);

// Stop when the search screen is destroyed.
stopSearchWatch();
```

### 22.4 Shared mutable singleton to named store

**Before:**

```ts
export const session = {
  user: null as User | null,
  setUser(user: User) {
    this.user = user;
  },
};
```

**After:**

```ts
import { defineStore, useStore } from "onekit-js";

type User = { id: string; name: string };

export const session = defineStore("session", () => ({
  state: { user: null as User | null },
  actions: {
    setUser(user: User) {
      this.state.user = user;
    },
    clear() {
      this.state.user = null;
    },
  },
}));

const currentSession = useStore<typeof session>("session");
currentSession.setUser({ id: "u1", name: "Ada" });
```

A named store gives the application an explicit lookup and removal contract. For SSR, create request-owned state rather than putting request data into a process-wide singleton.

## 23. Complete component example with cleanup

The following example shows a component that owns an effect and a timer. The important migration detail is not the counter itself; it is that the component releases both resources when unmounted.

```ts
import {
  create,
  defineComponent,
  effect,
  mount,
  register,
  stop,
  unmount,
} from "onekit-js";

const Clock = defineComponent({
  name: "Clock",
  data: () => ({ now: new Date().toLocaleTimeString() }),
  template: `
    <section>
      <h2>Current time</h2>
      <time id="clock-value">{{now}}</time>
    </section>
  `,
  mounted(this: any) {
    this.clockTimer = window.setInterval(() => {
      this.state.now = new Date().toLocaleTimeString();
      this.update();
    }, 1000);
  },
  beforeUnmount(this: any) {
    window.clearInterval(this.clockTimer);
    this.clockTimer = undefined;
  },
});

register("Clock", Clock);
const instance = create("Clock");
if (!instance) throw new Error("Clock was not registered");
mount(instance, "#app");

// When the owning page/shell is destroyed:
unmount(instance);
```

If an effect is created outside the component definition, keep its runner and stop it in `beforeUnmount` or the owning teardown hook. Do not rely on garbage collection to remove event listeners or reactive dependencies.

## 24. Complete directive example

This example uses the V3 directive names and demonstrates a form, conditional rendering, list rendering, event modifiers, and two-way model binding.

```ts
import { compileTemplate, reactive } from "onekit-js";

const state = reactive({
  email: "",
  submitted: false,
  tags: ["migration", "v3"],
  submit() {
    this.submitted = true;
  },
});

const form = compileTemplate(
  `
    <form ok-on.submit.prevent="submit()">
      <label>
        Email
        <input type="email" ok-model="email" />
      </label>
      <button type="submit">Continue</button>
      <p ok-if="submitted">Submitted for {{email}}</p>
      <ul>
        <li ok-for="tag, index in tags">{{index}}: {{tag}}</li>
      </ul>
    </form>
  `,
  state,
);

document.querySelector("#app")?.appendChild(form);
```

The expression context must contain the values and functions referenced by the template. For an event handler, the DOM event is available as `$event`:

```ts
const button = compileTemplate(
  `<button ok-on.click="handle($event)">Inspect event</button>`,
  { handle: (event: Event) => console.log(event.type) },
);
```

Do not build a directive expression by concatenating user input. Choose a named application function and pass validated values as data.

## 25. Complete router and route rendering example

The router resolves a route; the application decides how to render its result. This separation is useful during migration because the old route table and the new view renderer can coexist temporarily.

```ts
import { createRouter, h, render } from "onekit-js";

const routes = [
  { path: "/", handler: () => ({ screen: "home" }) },
  {
    path: "/users/:id",
    loader: async ({ to }: any) => {
      const response = await fetch(`/api/users/${to.params.id}`);
      if (!response.ok) throw new Error(`User request failed: ${response.status}`);
      return response.json();
    },
  },
  { path: "/login", beforeEnter: () => "/" },
];

const router = createRouter(routes, { mode: "memory", notFound: { path: "/404" } });
const root = document.querySelector("#app");
if (!root) throw new Error("#app was not found");

function renderMatch(match: any) {
  if (!match) return;
  const view = match.route.path === "/users/:id"
    ? h("article", {}, `User: ${match.data?.name ?? match.location.params.id}`)
    : match.route.path === "/404"
      ? h("h1", {}, "Not found")
      : h("h1", {}, "Home");

  root.replaceChildren(render(view) as Node);
}

const unsubscribe = router.subscribe((to) => renderMatch(to));
await router.start();
await router.navigate("/users/42");

// Route scope teardown:
unsubscribe();
router.stop();
```

For a browser application, change `mode` to `history` or `hash` and configure the server accordingly. For unit tests, keep `memory` mode so that tests do not depend on browser history.

## 26. Complete SSR and hydration example

The following pair shows the boundary between server rendering and client hydration. The server function is request-scoped and does not read browser globals.

### Server module

```ts
import { createSSRContext, h, renderTitle, renderToString } from "onekit-js";

export function renderRequest(url: string) {
  const context = createSSRContext();
  context.meta = { description: `Page for ${url}` };
  context.head?.push(renderTitle("OneKit V3 page"));

  return renderToString(
    h("html", {},
      h("head"),
      h("body", {},
        h("main", { id: "app", "data-url": url }, `Rendered: ${url}`),
      ),
    ),
    context,
  );
}
```

### Browser module

```ts
import { h, hydrate } from "onekit-js";

const root = document.querySelector("#app");
if (root) {
  const result = hydrate(
    root,
    h("main", { id: "app", "data-url": window.location.pathname },
      `Rendered: ${window.location.pathname}`,
    ),
  );

  if (result.mismatches.length > 0) {
    console.warn("Server/client mismatch", result.mismatches);
  }

  window.addEventListener("pagehide", () => result.dispose(), { once: true });
}
```

In a real server, escape or validate any URL-derived data before putting it into a response model. Keep the request context local to the request and never reuse it across concurrent requests.

## 27. Complete test examples

The repository uses Jest with `ts-jest` and a JSDOM environment. A migrated feature should test both behavior and teardown.

```ts
import { effect, reactive, stop } from "onekit-js";

describe("migrated counter", () => {
  beforeEach(() => {
    document.body.innerHTML = `<output id="count"></output>`;
  });

  it("updates the DOM through a reactive effect", () => {
    const state = reactive({ count: 0 });
    const runner = effect(() => {
      document.querySelector("#count")!.textContent = String(state.count);
    });

    expect(document.querySelector("#count")!.textContent).toBe("0");
    state.count = 2;
    expect(document.querySelector("#count")!.textContent).toBe("2");

    stop(runner);
  });

  it("does not update after teardown", () => {
    const state = reactive({ count: 0 });
    const runner = effect(() => {
      document.querySelector("#count")!.textContent = String(state.count);
    });

    stop(runner);
    state.count = 3;
    expect(document.querySelector("#count")!.textContent).toBe("0");
  });
});
```

Run the test suite serially when debugging shared DOM state:

```bash
npm test -- --runInBand
```

For a generated project, use the project test command through the CLI:

```bash
onekit test --cwd ./my-app -- --runInBand
```

## 28. Example-by-example migration order

When migrating an existing feature, use this sequence and commit after each stable step:

```text
1. Copy the existing behavior into a focused test.
2. Install onekit-js and create an explicit V3 entrypoint.
3. Replace global access with named imports.
4. Wrap state in reactive or move shared state into defineStore.
5. Convert event/listener setup and add teardown.
6. Convert the view to a component, template, or VDOM function.
7. Add route subscription and route-scope cleanup if the feature is routed.
8. Add SSR/hydration checks if the route is server-rendered.
9. Run type-check, tests, and production build.
10. Verify a clean package install before release.
```

The migration is complete only when the feature behaves correctly after a full page reload, a route transition, a browser back/forward action where applicable, a server render/hydration cycle where applicable, and a production build.

## 29. References

- [OneKit JS README](README.md)
- [V3 Usage Guide](docs/V3_USAGE.md)
- [Framework Guide](docs/FRAMEWORK_GUIDE.md)
- [Getting Started](docs/GETTING_STARTED.md)
- [Production Readiness](docs/PRODUCTION_READINESS.md)
- [Changelog](CHANGELOG.md)
- [OneKit JS GitHub repository](https://github.com/hidecard/onekit-js)
