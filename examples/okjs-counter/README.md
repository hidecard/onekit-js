# OneKit `.okjs` Counter Example

This example demonstrates a complete `Counter.okjs` component with OneKit V3 reactive state, fine-grained template bindings, event handlers, a keyed `ok-for` list, scoped CSS, and Vite HMR.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL and edit `src/Counter.okjs`. Template, script, and scoped-style changes are handled by the OneKit Vite plugin during development.

The example's `main.ts` remains a conventional application entrypoint. `Counter.okjs` is an importable component file, just like a `.jsx` or `.vue` component.

## Local repository development

When developing the example against the current checkout instead of the published package, replace the dependency with:

```json
"onekit-js": "file:../.."
```

Build the library from the repository root first:

```bash
npm run build
cd examples/okjs-counter
npm install
npm run build
```
