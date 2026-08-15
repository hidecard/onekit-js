# OneKit OKJS for VS Code

This extension adds language support for OneKit JS V3 `.okjs` single-file components. It associates `.okjs` files with the OneKit OKJS language, highlights `<script>`, `<template>`, and `<style>` blocks, embeds TypeScript/JavaScript/CSS/HTML grammars, highlights OneKit directives, and provides starter snippets.

## Local installation

From the repository root:

```bash
cd extensions/vscode-okjs
npm install
npm run package
code --install-extension onekit-okjs-0.1.0.vsix
```

Restart or reload VS Code after installation if an already-open `.okjs` file does not immediately change language mode. The extension can also be installed from the Extensions view by choosing **Install from VSIX...**.

## Snippets

| Prefix | Purpose |
|---|---|
| `ok-component` | Full OneKit component with script, template, style, state, and event method |
| `ok-template` | A `<template>` block |
| `ok-interpolation` | A `{{ expression }}` interpolation |
| `ok-for` | A keyed `ok-for` list example |

## Supported `.okjs` shape

```okjs
<script lang="ts">
export default {
  name: 'Card',
  data: () => ({ title: 'Hello' }),
};
</script>

<template>
  <article class="card">
    <h1>{{title}}</h1>
  </article>
</template>

<style scoped>
.card { padding: 1rem; }
</style>
```

The extension supplies editor highlighting only. Runtime compilation and HMR are provided by the OneKit Vite plugin:

```ts
import { defineConfig } from 'vite';
import { oneKitVitePlugin } from 'onekit-js/vite';

export default defineConfig({
  plugins: [oneKitVitePlugin()],
});
```

## Publishing

The package is ready for a private/local VSIX workflow. For Visual Studio Marketplace publication, update the publisher identity, version, icon, changelog, and Marketplace metadata, then authenticate `vsce` with a publisher token before running `npm run package` or `vsce publish`.
