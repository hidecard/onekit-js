# OneKit JS

Simple DOM utilities and reactive state helpers for modern JavaScript apps.

## Installation

```bash
npm install onekit-js
```

## Usage in frameworks (React / Vue / Svelte / Vite, etc.)

In any bundler-based project (Vite, webpack, Create React App, Next.js, etc.) you can import OneKit with a **bare module specifier**, just like React:

```js
import { ok, reactive, watch, announce } from 'onekit-js';

// Create reactive state
const state = reactive({ count: 0 });

// React to changes
watch(state, 'count', (next, prev) => {
  console.log('count changed', prev, '→', next);
});

// Wire up DOM events (this works in any app shell)
ok('#inc').click(() => state.count++);
ok('#dec').click(() => state.count--);

ok('#greet').click(() => {
  const name = document.querySelector('#input-name')?.value || 'World';
  ok('#name').text(name);
  announce(`Greeted ${name}`);
});
```

This usage works in:

- React apps (CRA, Next.js, Remix, etc.)
- Vue / Nuxt
- Svelte / SvelteKit
- Vite "vanilla" or any other bundler that understands `node_modules`.

You typically put the above code in your main entry file (for example `src/main.js`, `src/index.tsx`, or inside a component `useEffect` in React if you want to run it after mount).

### React (Vite or CRA)

```jsx
import { useEffect } from 'react';
import { ok, reactive, watch, announce } from 'onekit-js';

export function App() {
  useEffect(() => {
    const state = reactive({ count: 0 });

    watch(state, 'count', (next) => {
      ok('#count').text(String(next));
    });

    ok('#inc').click(() => state.count++);
    ok('#dec').click(() => state.count--);

    ok('#greet').click(() => {
      const name = document.querySelector('#input-name')?.value || 'World';
      ok('#name').text(name);
      announce(`Greeted ${name}`);
    });
  }, []);

  return (
    <div>
      <h1>Hello <span id="name">World</span>!</h1>
      <input id="input-name" />
      <button id="greet">Greet</button>
      <div>
        Count: <span id="count">0</span>
        <button id="inc">+</button>
        <button id="dec">-</button>
      </div>
    </div>
  );
}
```

### Vue 3 (script setup)

```vue
<script setup>
import { onMounted } from 'vue';
import { ok, reactive, watch, announce } from 'onekit-js';

onMounted(() => {
  const state = reactive({ count: 0 });

  watch(state, 'count', (next) => {
    ok('#count').text(String(next));
  });

  ok('#inc').click(() => state.count++);
  ok('#dec').click(() => state.count--);

  ok('#greet').click(() => {
    const name = document.querySelector('#input-name')?.value || 'World';
    ok('#name').text(name);
    announce(`Greeted ${name}`);
  });
});
</script>

<template>
  <div>
    <h1>Hello <span id="name">World</span>!</h1>
    <input id="input-name" />
    <button id="greet">Greet</button>
    <div>
      Count: <span id="count">0</span>
      <button id="inc">+</button>
      <button id="dec">-</button>
    </div>
  </div>
</template>
```

### Svelte

```svelte
<script>
  import { onMount } from 'svelte';
  import { ok, reactive, watch, announce } from 'onekit-js';

  onMount(() => {
    const state = reactive({ count: 0 });

    watch(state, 'count', (next) => {
      ok('#count').text(String(next));
    });

    ok('#inc').click(() => state.count++);
    ok('#dec').click(() => state.count--);

    ok('#greet').click(() => {
      const name = document.querySelector('#input-name')?.value || 'World';
      ok('#name').text(name);
      announce(`Greeted ${name}`);
    });
  });
</script>

<h1>Hello <span id="name">World</span>!</h1>
<input id="input-name" />
<button id="greet">Greet</button>
<div>
  Count: <span id="count">0</span>
  <button id="inc">+</button>
  <button id="dec">-</button>
</div>
```

### Vite vanilla

In a Vite "vanilla" project (`npm create vite@latest my-app -- --template vanilla`):

```js
// src/main.js
import { ok, reactive, watch, announce } from 'onekit-js';

const state = reactive({ count: 0 });

watch(state, 'count', (next) => {
  ok('#count').text(String(next));
});

ok('#inc').click(() => state.count++);
ok('#dec').click(() => state.count--);

ok('#greet').click(() => {
  const name = document.querySelector('#input-name')?.value || 'World';
  ok('#name').text(name);
  announce(`Greeted ${name}`);
});
```

## Usage in plain HTML (no framework)

If you are not using a bundler and just have an `index.html`, import the ESM build with a **relative path**:

```html
<script type="module">
  import { ok, reactive, watch, announce } from './node_modules/onekit-js/dist/onekit.esm.js';

  const state = reactive({ count: 0 });
  watch(state, 'count', (next) => ok('#count').text(String(next)));

  ok('#inc').click(() => state.count++);
  ok('#dec').click(() => state.count--);
</script>
```

Or use the UMD build as a global if you prefer classic `<script>` tags:

```html
<script src="./node_modules/onekit-js/dist/onekit.js"></script>
<script>
  const { ok, reactive, watch, announce } = OneKit;
  // use ok(), reactive(), watch(), announce() as shown above
</script>
```

## TypeScript

Type definitions are included and exposed via the package `types` field, so imports like

```ts
import { ok, reactive } from 'onekit-js';
```

work out of the box in TypeScript projects.
