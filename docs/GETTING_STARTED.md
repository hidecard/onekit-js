# OneKit JS V3 — Getting Started

OneKit JS V3.1.9 သည် browser အခြေပြု JavaScript/TypeScript application များအတွက် **reactivity, component lifecycle, virtual DOM, routing, storage, API helpers နှင့် SSR utilities** ကို package တစ်ခုအတွင်း ပေါင်းစည်းပေးသော framework-style library ဖြစ်သည်။ React လို component-oriented application များရေးနိုင်သော်လည်း React runtime ကို dependency အဖြစ် မလိုအပ်ပါ။

> API အားလုံး၏ signature, runnable examples, migration notes, troubleshooting နှင့် release checklist ကို [Complete V3 Usage Guide](V3_USAGE.md) တွင် ဖတ်ရှုပါ။

## Installation

```bash
npm install onekit-js
```

ES module မှ import လုပ်ပါ။

```ts
import { reactive, effect, register, mount } from 'onekit-js';
```

Browser CDN အသုံးပြုလိုပါက build file ကို သုံးနိုင်သည်။

```html
<script src="https://unpkg.com/onekit-js/dist/onekit.js"></script>
<script>
  const state = OneKit.reactive({ count: 0 });
  OneKit.effect(() => {
    document.querySelector('#app').textContent = String(state.count);
  });
</script>
```

## အမြန်ဆုံး Reactive Example

```ts
import { reactive, effect } from 'onekit-js';

const state = reactive({ count: 0 });
const app = document.querySelector<HTMLButtonElement>('#counter')!;

effect(() => {
  app.textContent = `Count: ${state.count}`;
});

app.addEventListener('click', () => {
  state.count += 1;
});
```

`reactive()` သည် object ကို Proxy ဖြင့် wrap လုပ်ပေးပြီး `effect()` သည် ဖတ်ထားသော property များ ပြောင်းလဲသည့်အခါ ပြန် run လုပ်သည်။ Derived state အတွက် `computed(() => value)` ကို သုံးနိုင်သည်။

## Component API

Component တစ်ခုကို `register(name, definition)` ဖြင့် မှတ်ပုံတင်နိုင်သည်။ Definition တွင် `template`, `data`, `props`, `methods`, `mounted`, `beforeUpdate`, `unmounted` တို့ကို ထည့်နိုင်သည်။

```ts
import { create, register, mount } from 'onekit-js';

register('welcome-card', {
  props: {
    name: { type: String, required: true }
  },
  data: () => ({ visits: 0 }),
  template: '<section><h2>Welcome, {{name}}</h2><p>Visits: {{visits}}</p></section>',
  mounted() {
    this.visits += 1;
  }
});

mount(create('welcome-card', { name: 'OneKit developer' }), '#app');
```

Props များကို validate လုပ်ပြီး instance state ကို သီးခြားထိန်းပေးသည်။ `create()` သည် component instance ပြန်ပေးပြီး `destroy()` သည် event listener နှင့် DOM reference များကို ရှင်းလင်းပေးသည်။

## Store API

Global state အတွက် `defineStore()` သို့မဟုတ် `createStore()` ကို သုံးနိုင်သည်။ Store သည် `$patch`, `$reset`, `$subscribe` နှင့် action/getter များပါဝင်သည်။

```ts
import { defineStore } from 'onekit-js';

const cart = defineStore('cart', () => ({
  state: () => ({ items: [] as string[] }),
  getters: {
    total: state => state.items.length
  },
  actions: {
    add(item: unknown) {
      (this.$state.items as string[]).push(String(item));
    }
  }
}));

cart.add('Keyboard');
console.log(cart.total.value);
```

## Routing, Storage နှင့် API

Router အတွက် route definitions နှင့် `router.push()` ကို သုံးနိုင်သည်။ Browser storage အတွက် `storage` helpers များ၊ HTTP request များအတွက် `request`, `get`, `post`, `put`, `del` တို့ကို အသုံးပြုနိုင်သည်။ Network error များကို application boundary တွင် catch လုပ်ပြီး user-facing state ပြောင်းရန် အကြံပြုသည်။

```ts
import { get } from 'onekit-js';

const response = await get<{ name: string }>('/api/profile');
if (response.ok) console.log(response.data.name);
```

## SSR နှင့် Streaming

Server-side HTML string ထုတ်ရန် `renderToString()` နှင့် async output အတွက် `StreamingRenderer` ကို သုံးနိုင်သည်။ SSR code ကို Node/server runtime တွင်သာ run လုပ်ပြီး browser-only APIs များကို lifecycle hook သို့မဟုတ် environment guard အတွင်းထားပါ။

## CLI Starter Project

The npm package is named `onekit-js`, while its executable is named `onekit`. Therefore, use the explicit package form with `npx`:

```bash
npx --yes --package=onekit-js onekit create my-app
cd my-app
npm install
npm run dev
```

Alternatively, install the CLI globally:

```bash
npm install --global onekit-js
onekit create my-app
```

`npx onekit create my-app` searches for a package named `onekit`, not the `onekit` binary shipped by `onekit-js`, and may produce `could not determine executable to run`.

## Project Commands

| Command | Purpose |
|---|---|
| `npm run type-check` | TypeScript strict checking |
| `npm run build` | UMD, ESM, CJS bundles နှင့် declaration files build |
| `npm test -- --runInBand` | Jest test suite run |
| `npm run dev:vite` | Vite playground development server |
| `npm run dev` | Rollup watch mode |

## Repository Structure

| Directory | Responsibility |
|---|---|
| `src/core` | Core runtime, DI, plugin နှင့် error handling |
| `src/modules/reactive.ts` | `reactive`, `effect`, `computed`, watcher utilities |
| `src/modules/component.ts` | Component registry, props, lifecycle, mounting |
| `src/modules/vdom.ts` | Virtual DOM creation and patching |
| `src/modules/store.ts` | Global state store and plugins |
| `src/modules/ssr.ts` | String rendering, hydration, streaming |
| `examples/counter` | Reactive state mini project |
| `examples/todo` | Component + store mini project |
| `tests` | Automated regression tests |

## Troubleshooting

`npm run type-check` အောင်မြင်ပြီး `npm test` မအောင်မြင်ပါက `package.json` တွင် `type: module` ပါရှိသည့်အတွက် Jest configuration file သည် `jest.config.cjs` ဖြစ်ရမည်။ Build ပြီးနောက် package metadata သည် `dist/types` အောက်ရှိ declaration files နှင့် ကိုက်ညီရမည်။ Browser တွင် package import မရပါက Vite/အခြား ESM-aware dev server ဖြင့် run လုပ်ပြီး `dist` folder ကို static server မှ တိုက်ရိုက် serve မလုပ်မီ build ပြီးကြောင်း စစ်ပါ။

## Contribution Workflow

ပြင်ဆင်မှုတစ်ခုစီအတွက် type-check, build နှင့် test ကို run လုပ်ပါ။ Public API ပြောင်းလဲပါက README, migration note နှင့် example တစ်ခုကို တပြိုင်နက် update လုပ်ပါ။ Commit မတင်မီ generated `dist` output ကို source code နှင့်အတူ ပြန် build ထားရမည်။
