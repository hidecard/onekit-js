# OneKit `.okjs` Single-File Components

OneKit JS V3 supports `.okjs` files as a compact Single-File Component format. A component file can contain one `<script>` block, one `<template>` block, and one `<style>` block. The Vite plugin compiles the file into a normal OneKit component module, so the browser does not need to understand the `.okjs` syntax directly.

## Minimal component

```okjs
<script lang="ts">
export default {
  name: 'Counter',
  data: () => ({ count: 0 }),
  methods: {
    increment(this: any) {
      this.state.count += 1;
      this.update();
    },
  },
};
</script>

<template>
  <section class="counter">
    <h1>Count: {{count}}</h1>
    <button ok-on.click="increment()" type="button">Increment</button>
  </section>
</template>

<style scoped>
.counter { padding: 1rem; }
</style>
```

The `<script>` block must export a default OneKit component definition. The `<template>` block is compiled through OneKit's restricted template expression engine. The optional `<style scoped>` block receives a generated `data-okjs-scope` attribute and CSS selector prefix. A style block without `scoped` is injected as a module-level style.

## Vite integration

Add the OneKit Vite plugin to `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { oneKitVitePlugin } from 'onekit-js/vite';

export default defineConfig({
  plugins: [oneKitVitePlugin()],
});
```

The plugin transforms `.okjs` files and also emits OneKit HMR update events. A compiled module accepts HMR updates and removes its injected style element when the module is disposed.

## Mounting a component

A `.okjs` default export is a component definition. Register and mount it from the application entrypoint:

```ts
import { create, mount, register } from 'onekit-js';
import Counter from './Counter.okjs';

register('Counter', Counter);
const instance = create('Counter');
if (instance) mount(instance, '#app');
```

Files such as `App.okjs`, `Header.okjs`, `Counter.okjs`, `main.okjs`, and `index.okjs` all use the same component-file format. The filename does not change the compiler contract; the application entrypoint remains the normal `main.ts` or `main.js` file that imports and mounts a `.okjs` component.

The CLI starter generator creates this structure automatically:

```bash
npm create onekit@latest my-app
cd my-app
npm install
npm run dev
```

## Supported blocks and constraints

| Block | Required | Supported behavior |
|---|---:|---|
| `<script>` | No | Default-export a OneKit component definition. `lang="ts"` and `lang="js"` are supported. |
| `<template>` | Yes | Compiled with `compileTemplate`, restricted expressions, directives, fine-grained interpolation, and keyed `ok-for`. |
| `<style>` | No | Injected once per module. Add `scoped` to scope selectors to the component root. |

Top-level custom blocks are rejected to keep the format predictable and secure. JavaScript statements inside template expressions are not enabled by `.okjs`; the same AST restrictions as normal OneKit templates apply.

## Public compiler API

The parser and compiler are available for tooling integrations. They treat every `.okjs` filename as a component file, including `main.okjs` and `index.okjs`:


```ts
import { compileOkjs, parseOkjs } from 'onekit-js/okjs';

const source = await fetch('/components/Card.okjs').then(response => response.text());
const blocks = parseOkjs(source, 'Card.okjs');
const result = compileOkjs(source, 'Card.okjs');
console.log(blocks.template, result.code);
```

The compiler currently returns a JavaScript module string and a `null` source map. Vite remains the recommended integration because it performs the subsequent TypeScript/JavaScript transform and module graph handling.

## HMR and lifecycle safety

`.okjs` modules accept Vite HMR updates and clean up their generated style element on disposal. Runtime resources created by the component should still be registered in the component scope or with `registerHMRDisposable` when they are module-owned:

```ts
import { effectScope } from 'onekit-js';
import { registerHMRDisposable } from 'onekit-js/vite';

const scope = registerHMRDisposable(effectScope(true));
```

Always validate a production build separately from HMR development. HMR state preservation is a developer convenience and must not be required for application correctness.

## Security model

`.okjs` does not add a second expression evaluator. Template expressions use OneKit's restricted AST evaluator, dynamic `href` and `src` bindings pass through URL sanitization, and HTML is sanitized before component rendering. Treat the `.okjs` source itself as trusted application code and keep user-provided template source outside the compiler boundary.
