# OneKit JS

**OneKit JS V3** is a compact, TypeScript-first reactive JavaScript framework for component-based browser applications. It provides a small runtime with explicit APIs for state, components, templates, JSX, routing, stores, SSR helpers, HTTP requests, browser storage, accessibility, security, plugins, dependency injection, animations, and Web Components.

> **Current release:** `3.1.9`  
> **License:** MIT  
> **Documentation:** [Complete V3 usage guide](docs/V3_USAGE.md)

## Install

```bash
npm install onekit-js
```

```ts
import { reactive, effect, defineComponent, mount } from "onekit-js";
```

## Create an application

The CLI generates a Vite + TypeScript starter:

```bash
npx onekit create my-app
cd my-app
npm install
npm run dev
```

Build an application from its standard source entrypoint with:

```bash
npx onekit build
```

Use `npx onekit --help` to inspect the CLI commands. The generated starter includes a preview-safe Vite host configuration.

## First reactive application

```ts
import { reactive, effect } from "onekit-js";

const state = reactive({ count: 0 });

effect(() => {
  const output = document.querySelector("#count");
  if (output) output.textContent = String(state.count);
});

document.querySelector("#increment")?.addEventListener("click", () => {
  state.count += 1;
});
```

```html
<span id="count">0</span>
<button id="increment">Increment</button>
```

## Public V3 API map

| Area | Main exports | Purpose |
|---|---|---|
| Reactive state | `reactive`, `effect`, `computed`, `watch`, `batch`, `nextTick`, `snapshot`, `bind` | Track state and update DOM/application effects. |
| Components | `defineComponent`, `register`, `create`, `mount`, `unmount`, `destroy`, lifecycle hooks | Define, mount, update, and destroy components. |
| Templates | `compileTemplate`, `registerDirective` | Compile interpolation and directive-based HTML. |
| JSX and VDOM | `h`, `jsx`, `jsxDEV`, `okjs`, `Fragment`, `createElement`, `render`, `patch`, `vdomPatch` | Create, render, and reconcile virtual nodes with keyed children, refs, props, and events. |
| Router | `createRouter`, `Router`, `router` | Match static/dynamic routes, parse params/query, run guards/loaders, navigate, and subscribe. |
| Stores | `defineStore`, `createStore`, `useStore`, `getAllStores`, `removeStore`, `addStorePlugin` | Share application state and store plugins. |
| SSR | `renderToString`, `hydrate`, `createSSRContext`, head/body helpers | Render HTML on the server and hydrate on the client. |
| HTTP | `request`, `get`, `post`, `put`, `del`, `patch`, `API` | Use fetch-based HTTP helpers. |
| Browser storage | `localStorage`, `sessionStorage`, `cache`, `createStorage` | Store namespaced browser data. |
| Accessibility | `announce`, `trapFocus`, `createSkipLink`, `setAriaAttributes`, `validateAccessibility` | Build keyboard- and screen-reader-friendly interfaces. |
| Security | `sanitizeHTML`, `sanitizeInput`, `sanitizeURL`, `validateJSON`, `generateCSPHeader` | Validate and sanitize untrusted values. |
| Utilities | `debounce`, `throttle`, `deepClone`, `generateId` | Common application helpers. |
| Platform | `registerWebComponent`, `OneKitWebComponent`, `animations` | Integrate with Custom Elements and DOM animation helpers. |
| Core | `pluginManager`, `DependencyInjector`, `di`, `errorHandler`, `safeMethod` | Extend applications and centralize services/errors. |

The complete signatures and runnable examples for every area are in [docs/V3_USAGE.md](docs/V3_USAGE.md).

## Component example

```ts
import {
  defineComponent,
  register,
  create,
  mount,
} from "onekit-js";

register("Counter", defineComponent({
  name: "Counter",
  props: { step: { type: "number", default: 1 } },
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
}));

const instance = create("Counter", { step: 2 });
if (instance) mount(instance, "#app");
```

## SSR example

```ts
import { createSSRContext, renderToString, h, renderTitle } from "onekit-js";

const context = createSSRContext();
context.head.push(renderTitle("OneKit page"));
const result = renderToString(h("main", null, "Hello from SSR"), context);
console.log(result.html);
```

## Examples

The repository includes two runnable mini projects:

```bash
npx vite --root examples/counter
npx vite --root examples/todo
```

The counter demonstrates `reactive` and `effect`. The todo project demonstrates shared state, actions, and reactive rendering. Both projects are intentionally small enough to use as templates for new applications.

## Documentation set

| Document | Contents |
|---|---|
| [V3 Usage Guide](docs/V3_USAGE.md) | Complete install, CLI, API, SSR, accessibility, security, migration, troubleshooting, and release usage. |
| [Getting Started](docs/GETTING_STARTED.md) | Quick setup and first application workflow. |
| [Framework Guide](docs/FRAMEWORK_GUIDE.md) | Architecture, conventions, and framework design guidance. |
| [Production Readiness](docs/PRODUCTION_READINESS.md) | Current framework gaps, production adoption guidance, milestones, and release checklist. |
| [Changelog](CHANGELOG.md) | Release history and maintenance notes. |
| [Counter example](examples/counter) | Minimal reactive application. |
| [Todo example](examples/todo) | Store-backed application example. |

## Verification

Run the same checks used for release readiness:

```bash
npm run type-check
npm test -- --runInBand
npm run build
npm pack --dry-run
```

Before publication, inspect the dry-run tarball and verify that `dist`, declarations, CLI files, README, documentation, and license are included. Actual npm publication requires an authenticated npm session:

```bash
npm login
npm publish --access public
```

Never commit or share npm access tokens.

## V3 migration notes

V3 applications should import public APIs from `onekit-js` rather than reaching into private source files. Use `defineComponent` for readable component definitions, `unmount` for teardown, and `nextTick` when work must run after the reactive microtask. Keep the package version, `VERSION` constant, README, changelog, examples, and website release banner synchronized.

The V3 router resolves application navigation and data but does not automatically render route components. Connect matched routes to the renderer or component layer, and call `router.stop()` when the router scope is destroyed.

## License

MIT © OneKit contributors
