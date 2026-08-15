# OneKit JS Framework Guide

OneKit JS V3.1.12 is a small, browser-first JavaScript and TypeScript framework with reactive state, component lifecycle hooks, a store, routing, server-side rendering, JSX helpers, web components, and a zero-configuration CLI. The API is intentionally modular: applications may start with a single `reactive` object and grow into component- and route-based projects without adopting a large runtime. For copy-ready signatures and runnable usage for every public area, continue with [V3_USAGE.md](V3_USAGE.md).

## Recommended application shape

```text
my-app/
├── index.html
├── src/
│   ├── main.ts
│   ├── components/
│   ├── stores/
│   └── styles.css
├── package.json
└── vite.config.ts
```

Create a starter project with the CLI:

```bash
npm create onekit@latest my-app
# or, use the official package explicitly:
npx --yes --package=onekit-js onekit create my-app
# or, use the standalone create command:
npx create-onekit my-app
cd my-app
npm install
npm run dev
```

The generated project uses Vite for development and production bundling. OneKit itself does not require a global runtime or a custom compiler.

## Core APIs

| API | Purpose | Example |
|---|---|---|
| `reactive` | Creates a proxy-backed reactive object. | `const state = reactive({ count: 0 })` |
| `effect` | Re-runs a function when its reactive dependencies change. | `effect(() => render(state.count))` |
| `computed` | Derives a cached value from reactive state. | `const total = computed(() => state.price * state.qty)` |
| `watch` | Observes a property or getter and receives new/old values. | `watch(state, 'count', callback)` |
| `batch` | Groups multiple mutations into one update flush. | `batch(() => { state.a++; state.b++; })` |
| `nextTick` | Schedules work after the current reactive flush. | `await nextTick()` |
| `defineComponent` | Provides a typed component definition without registration side effects. | `const Card = defineComponent({ template: '...' })` |
| `register` and `mount` | Registers and mounts named components. | `register('card', Card); mount('card', '#app')` |
| `defineStore` | Creates a state container with actions and plugins. | `const useCart = defineStore('cart', options)` |
| `Router` | Provides route matching and navigation. | `const router = new Router({ routes })` |
| `renderToString` | Renders a VNode or string for SSR. | `renderToString({ tag: 'main', props: {}, children: [] })` |
| `enableDevTools` | Enables opt-in reactive/router inspection events for development tooling. | `const bridge = enableDevTools()` |

## Components

A component definition may use `data`, `template`, `render`, `methods`, prop validation, and lifecycle hooks. Prop types use OneKit's string literals rather than JavaScript constructor objects.

```ts
import { defineComponent, register } from 'onekit-js';

const Greeting = defineComponent({
  props: { name: { type: 'string', required: true } },
  template: '<h1>Hello {{name}}</h1>',
  mounted() {
    console.log('Greeting mounted');
  }
});

register('greeting-card', Greeting);
```

The lifecycle sequence is `beforeCreate`, `created`, `beforeMount`, `mounted`, `beforeUpdate`, `updated`, `beforeUnmount`, and `unmounted`. Composition-style lifecycle helpers are also available for code executing inside a component setup flow.

## CLI

The CLI is included in the npm package and exposes predictable commands:

```bash
onekit help
onekit create dashboard
onekit dev
onekit build --out-dir dist
onekit preview
onekit test
onekit build --no-minify
```

`onekit create` and `npm create onekit@latest` generate Vite-compatible TypeScript or JavaScript starters. `onekit dev`, `onekit preview`, and `onekit test` delegate to the current project's scripts, preserve child exit codes, support `--cwd <directory>`, and forward arguments after `--`. Preview requires a `dist` output directory. `onekit build` reads the current package's `source` field, or falls back to `src/index.js`, and emits ESM, CommonJS, browser, source-map, and optional minified artifacts.

## Public package subpaths

Use the root import for normal applications and subpaths for library authors who want to communicate intent clearly:

```ts
import { reactive, nextTick } from 'onekit-js';
import { defineStore } from 'onekit-js/store';
import { renderToString } from 'onekit-js/ssr';
import { defineComponent } from 'onekit-js/components';
```

All subpaths point to the same browser-safe distribution while exposing focused declaration files for editor tooling.

## Security and production guidance

OneKit sanitizes template HTML and rejects unsafe storage keys. Applications should still treat remote content as untrusted, validate API responses, avoid injecting raw HTML, and configure a Content Security Policy in production. Use `batch` for coordinated state changes and `nextTick` when code must observe the post-update DOM.

## Verification workflow

Run the following before publishing a package or application:

```bash
npm run type-check
npm test -- --runInBand
npm run build
npm run cli -- help
npm run cli -- dev --cwd ./examples/counter
```

For the experimental DevTools bridge, import `enableDevTools` or `onDevToolsEvent` from the root package. The bridge is disabled by default, SSR-safe, and should be disposed during application teardown. See the [complete DevTools contract](V3_USAGE.md#16-experimental-devtools-foundation).

The repository includes a counter and a store-backed todo example under `examples/`. They are intentionally small and suitable for regression checks, documentation snippets, and onboarding.
