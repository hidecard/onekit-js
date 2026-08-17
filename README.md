# OneKit JS

**OneKit JS V3** is a compact, TypeScript-first reactive framework for browser applications. It gives developers explicit building blocks for state, components, templates, JSX/VDOM, routing, stores, forms, data fetching, SSR/hydration, security, testing, and production tooling without forcing a large application architecture.

> **Current release:** `3.1.17`
> **Starter CLI:** `create-onekit@1.0.7`
> **License:** MIT
> **Runtime:** Browser-first JavaScript and TypeScript

OneKit is designed for developers who want a framework that is easy to learn but does not become restrictive as an application grows. You can begin with one reactive object and progressively adopt components, routes, stores, SSR, and typed tooling when the project needs them.

[![TypeScript-first](https://img.shields.io/badge/TypeScript-first-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Version](https://img.shields.io/badge/version-3.1.17-0f766e)](CHANGELOG.md)

## Documentation navigation

| Start here | Go deeper |
|---|---|
| [Quick start](#quick-start-in-five-minutes) | [Full V3 usage guide](docs/V3_USAGE.md) |
| [Mental model](#the-onekit-mental-model) | [Framework architecture](docs/FRAMEWORK_GUIDE.md) |
| [Feature map](#v3-feature-map) | [Production readiness](docs/PRODUCTION_READINESS.md) |
| [CLI reference](#cli-reference) | [Migration guide](MIGRATION_GUIDE.md) |
| [Contributing](#contributing-to-onekit) | [Changelog](CHANGELOG.md) |

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
| Routing | History/hash/memory modes, typed nested routes, guards, loaders, lazy components, prefetch, scroll restoration | `onekit-js/router` |
| Server rendering | Request-scoped SSR, streaming, async rendering, hydration, mismatch diagnostics, boundaries | `onekit-js/ssr` |
| Data and forms | HTTP helpers, retry/timeout/cancellation, query deduplication, typed forms, validation | `onekit-js/api`, `onekit-js/query`, `onekit-js/forms` |
| Browser integration | Storage, accessibility helpers, animations, Web Components | `onekit-js/storage`, `onekit-js/a11y`, `onekit-js/web-components` |
| Tooling | Vite plugin, `.okjs` support, CLI, HMR checks, DOM-first testing helpers | `onekit-js/vite`, `onekit-js/testing` |
| Diagnostics | Opt-in inspectors, lifecycle events, bounded history, profiling measurements | `onekit-js` |

V3 keeps these capabilities composable. An application can use only the reactive core, or combine components, routes, stores, SSR, testing, and tooling as it grows.

## Quick start in five minutes

### Option A: create a new project

The current starter generator is version `1.0.7`:

```bash
npm create onekit@1.0.7 my-app
cd my-app
npm install
npm run dev
```

You can also use the standalone package name:

```bash
npx create-onekit@1.0.7 my-app
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

The public component lifecycle includes creation, mounting, updating, and destruction. Prefer explicit teardown for subscriptions and resources. `unmount`/`destroy` should be called when an instance is no longer needed.

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

The router supports memory, browser, and hash-oriented navigation patterns, dynamic parameters, query parsing, guards, async loaders, redirects, lazy components, prefetching, and nested typed route records.

```ts
import { createRouter } from "onekit-js";

const router = createRouter({
  mode: "history",
  routes: [
    {
      path: "/",
      component: HomePage,
    },
    {
      path: "/projects/:projectId",
      component: ProjectLayout,
      children: [
        { path: "", component: ProjectOverview },
        { path: "/settings", component: ProjectSettings },
      ],
    },
  ],
});

router.start();
await router.navigate("/projects/onekit/settings");
```

Keep route loaders and guards abortable. OneKit protects the application from stale asynchronous navigation committing after a newer navigation wins. Use `prefetch()` to warm route data without changing the current URL or committed route state.

## Stores, query data, and forms

### Stores

Use stores for shared application state with explicit actions and subscriptions. Keep server data separate from local UI state when that separation makes invalidation and loading behavior clearer.

### Query client

`onekit-js/query` provides a small query foundation with deduplication and stale-time behavior:

```ts
import { QueryClient } from "onekit-js/query";

const queries = new QueryClient({ staleTime: 30_000 });
const result = await queries.fetch(["projects"], () =>
  fetch("/api/projects").then((response) => response.json()),
);
```

Use stable query keys. Do not create a fresh object or array as a query input on every render unless the client intentionally treats it as a new request.

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

See the [V3 Usage Guide](docs/V3_USAGE.md) for streaming examples and advanced SSR contracts.

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

The `onekit` CLI supports the following workflow:

```bash
onekit create my-app --typescript
onekit dev
onekit build
onekit preview
onekit test
onekit help
```

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
| [Changelog](CHANGELOG.md) | Version history and release notes. |
| [Issue tracker](https://github.com/hidecard/onekit-js/issues) | Bugs, feature proposals, and questions. |
| [GitHub repository](https://github.com/hidecard/onekit-js) | Source, tests, examples, and pull requests. |

## Versioning and release notes

The current framework release is **OneKit JS `3.1.17`**. The current starter CLI release documented here is **`create-onekit@1.0.7`**. The framework package and starter CLI may release independently; always check the command and package name when pinning versions.

OneKit follows semantic versioning. Additive APIs and fixes should remain compatible within a major version. Breaking changes require migration notes, updated examples, regression coverage, and an explicit changelog entry.

## License

OneKit JS is released under the [MIT License](LICENSE). Contributions are welcome under the same terms.
