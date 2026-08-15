# OneKit `.okjs` Vite Compilation, HMR နှင့် Signal-style Reactivity Guide

ဤ guide သည် OneKit JS V3 တွင် `.okjs` component file ကို Vite မှ compile လုပ်ပုံ၊ template/script HMR အလုပ်လုပ်ပုံနှင့် `Counter.okjs` ကို reactive state ဖြင့် တည်ဆောက်ပုံကို ရှင်းပြထားသည်။ OneKit ၏ `.okjs` သည် Vue Single-File Component ပုံစံနှင့် ဆင်တူသော်လည်း runtime သည် OneKit component definition၊ restricted template evaluator နှင့် fine-grained reactive effects များကို အသုံးပြုသည်။

## 1. Project setup

```bash
npm install onekit-js vite typescript
```

Vite configuration တွင် OneKit plugin ကို ထည့်ပါ။

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { oneKitVitePlugin } from 'onekit-js/vite';

export default defineConfig({
  plugins: [oneKitVitePlugin()],
});
```

Application entrypoint သည် ပုံမှန် TypeScript/JavaScript file ဖြစ်ပြီး `.okjs` component ကို import/mount လုပ်ပါသည်။ `.okjs` သည် component file format ဖြစ်သောကြောင့် `App.okjs`၊ `Counter.okjs`၊ `Header.okjs`၊ `main.okjs` နှင့် `index.okjs` အားလုံး compiler contract တူညီသည်။ Filename က auto-mount behavior မပြောင်းပါ။

```ts
// src/main.ts
import { create, mount, register } from 'onekit-js';
import Counter from './Counter.okjs';
import './style.css';

register('Counter', Counter);
const instance = create('Counter');
if (!instance) throw new Error('Counter component could not be created');
mount(instance, '#app');
```

## 2. Complete `Counter.okjs` example

အောက်ပါ file ကို `src/Counter.okjs` အဖြစ် သိမ်းပါ။

```okjs
<script lang="ts">
export default {
  name: 'Counter',

  // Component data is made reactive by OneKit.
  data: () => ({
    count: 0,
    step: 1,
    history: [{ id: 0, value: 0 }],
  }),

  methods: {
    increment(this: any) {
      this.state.count += this.state.step;
      this.recordHistory();
    },

    decrement(this: any) {
      this.state.count -= this.state.step;
      this.recordHistory();
    },

    reset(this: any) {
      this.state.count = 0;
      this.recordHistory();
    },

    recordHistory(this: any) {
      const nextId = this.state.history.length;
      this.state.history = [
        ...this.state.history,
        { id: nextId, value: this.state.count },
      ].slice(-6);
      this.update();
    },
  },
};
</script>

<template>
  <main class="counter-card">
    <p class="eyebrow">OneKit JS V3</p>
    <h1>Signal-style Counter</h1>

    <output class="count" aria-live="polite">{{count}}</output>

    <label class="step-control">
      Step
      <input ok-bind.value="step" type="number" min="1" max="10">
    </label>

    <div class="actions">
      <button ok-on.click="decrement()" type="button">−</button>
      <button ok-on.click="reset()" type="button">Reset</button>
      <button ok-on.click="increment()" type="button">+</button>
    </div>

    <h2>Recent values</h2>
    <ol class="history">
      <li ok-for="entry in history" ok-bind.key="entry.id">
        {{entry.value}}
      </li>
    </ol>
  </main>
</template>

<style scoped>
.counter-card {
  width: min(92vw, 34rem);
  padding: 2.5rem;
  color: #172033;
  text-align: center;
  background: #ffffff;
  border: 1px solid #dbe2ff;
  border-radius: 1.5rem;
  box-shadow: 0 1.5rem 4rem rgb(37 52 120 / 14%);
}

.eyebrow {
  margin: 0;
  color: #5757d5;
  font-size: .78rem;
  font-weight: 800;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.count {
  display: block;
  margin: 1.5rem 0;
  font-size: 4rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.step-control {
  display: inline-flex;
  gap: .5rem;
  align-items: center;
  color: #5b6478;
}

.step-control input {
  width: 4rem;
  padding: .45rem;
  border: 1px solid #c7d0ef;
  border-radius: .5rem;
}

.actions {
  display: flex;
  gap: .65rem;
  justify-content: center;
  margin: 1.5rem 0 2rem;
}

button {
  min-width: 3rem;
  padding: .7rem 1rem;
  color: white;
  font: inherit;
  font-weight: 700;
  background: #5757d5;
  border: 0;
  border-radius: .6rem;
  cursor: pointer;
}

.history {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: .4rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.history li {
  padding: .45rem .25rem;
  color: #4d5780;
  background: #eef2ff;
  border-radius: .4rem;
}
</style>
```

## 3. Signal-style reactivity ကို နားလည်ခြင်း

OneKit V3 သည် `signal()` function တစ်ခုတည်းကို public API အဖြစ် မသတ်မှတ်ထားဘဲ Proxy-based reactive object နှင့် effect dependency tracking ကို အသုံးပြုသည်။ ထို့ကြောင့် အောက်ပါ `data()` object သည် component instance ဖန်တီးချိန်တွင် reactive state ဖြစ်သွားသည်။

```ts
data: () => ({
  count: 0,
  step: 1,
})
```

`count` သို့မဟုတ် `step` ကို ပြောင်းလဲသောအခါ template compiler သည် expression တစ်ခုချင်းစီကို dependency အဖြစ် မှတ်ထားပြီး သက်ဆိုင်သည့် text node၊ attribute သို့မဟုတ် directive binding ကိုသာ update လုပ်သည်။ Application တစ်ခုလုံးကို render ပြန်မလုပ်ပါ။

| Code | Reactive အဓိပ္ပာယ် |
|---|---|
| `this.state.count += this.state.step` | Proxy state write ဖြစ်ပြီး dependent effects များကို notify လုပ်သည်။ |
| `{{count}}` | `count` ကို ဖတ်သော fine-grained text binding ဖြစ်သည်။ |
| `ok-bind.value="step"` | Input value နှင့် reactive state ကို ချိတ်သည်။ |
| `ok-for="entry in history"` | Collection effect ဖြစ်ပြီး keyed item DOM identity ကို ထိန်းသည်။ |
| `ok-bind.key="entry.id"` | List item အတွက် stable key သတ်မှတ်သည်။ |
| `this.update()` | Component-level methods တွင် explicit component update ကို တောင်းဆိုနိုင်သည်။ |

`data()` state ကို အပြင်မှ မပြင်ဘဲ component methods အတွင်းမှ ပြင်ခြင်းသည် ownership နှင့် teardown behavior ကို ရှင်းလင်းစေသည်။ Component destroy လုပ်ချိန်တွင် effect scope နှင့် list item scopes များကို အလိုအလျောက် dispose လုပ်သည်။

## 4. Vite compilation flow

`.okjs` file တစ်ခု import လုပ်သည့်အခါ Vite သည် `oneKitVitePlugin()` ၏ `transform` hook ကို ခေါ်သည်။ Compiler သည် block များကို အောက်ပါအတိုင်း ပြောင်းလဲသည်။

| Input block | Compiler output |
|---|---|
| `<script lang="ts">` | Component options အဖြစ် compile လုပ်သည်။ `export default` သည် internal options object ဖြစ်လာသည်။ |
| `<template>` | OneKit component ၏ template string ဖြစ်လာပြီး restricted AST evaluator ဖြင့် runtime compile လုပ်သည်။ |
| `<style scoped>` | Scope attribute နှင့် selector prefix ပါသော CSS style element ဖြစ်လာသည်။ |
| `<style>` | Global module style အဖြစ် inject လုပ်သည်။ |
| `.okjs` default export | `defineComponent({...options, template})` result အဖြစ် export လုပ်သည်။ |

Conceptually generated module သည် အောက်ပါပုံစံနှင့် ဆင်တူသည်။

```ts
import {
  defineComponent,
  hotUpdateComponent,
} from 'onekit-js';

const options = {
  name: 'Counter',
  data: () => ({ count: 0 }),
};

const component = defineComponent({
  ...options,
  template: '<button>{{count}}</button>',
});

export default component;
```

Actual generated code တွင် source URL၊ scoped style injection၊ HMR accept နှင့် HMR dispose code များပါဝင်သည်။

## 5. `.okjs` HMR flow

Vite dev server တွင် `.okjs` file ပြောင်းလဲသည့်အခါ update သည် module graph ထဲသို့ ဝင်ရောက်ပြီး compiled module ၏ `import.meta.hot.accept()` callback ကို ခေါ်သည်။ OneKit compiler သည် updated default export ကို `hotUpdateComponent()` ထံ ပေးပို့သည်။

```ts
if (import.meta.hot) {
  import.meta.hot.accept((nextModule) => {
    const nextComponent = nextModule?.default;
    if (nextComponent?.name) {
      hotUpdateComponent(nextComponent.name, nextComponent);
    }
  });
}
```

`hotUpdateComponent()` သည် active instance များအတွက် state၊ props၊ slots နှင့် DOM position ကို သိမ်းပြီး old definition ကို dispose လုပ်ကာ definition အသစ်ဖြင့် component ကို ပြန်တည်ဆောက်သည်။ ထို့ကြောင့်—

| ပြောင်းလဲမှု | Result |
|---|---|
| Template ပြောင်းခြင်း | UI structure/text ပြောင်းပြီး `count` ကဲ့သို့ state မပျောက်ပါ။ |
| Script method ပြောင်းခြင်း | Event handler နှင့် method logic အသစ်ကို အသုံးပြုသည်။ |
| Scoped style ပြောင်းခြင်း | Old injected style ကို dispose လုပ်ပြီး updated style ထည့်သည်။ |
| Component မရှိသေးခြင်း | Registry ထဲတွင် definition အသစ်ကို သိမ်းထားပြီး နောက် create လုပ်ချိန် အသစ်ကို အသုံးပြုသည်။ |

Vite plugin သည် DevTools/custom browser integrations အတွက် `onekit:hmr-update` event ကိုလည်း ပေးပို့သည်။ `.okjs` update event ၏ payload တွင် `kind: 'okjs-component'` နှင့် `reload: 'template-and-script'` ပါဝင်သည်။

## 6. Run the complete example

Repository ထဲရှိ runnable example ကို အသုံးပြုရန်—

```bash
cd examples/okjs-counter
npm install
npm run dev
```

Example package မရှိသေးသော local checkout တွင် `package.json` များကို project root မှ package installation နှင့်ချိတ်ဆက်ရန် သို့မဟုတ် `onekit-js` ကို npm registry မှ install လုပ်ရန်လိုသည်။ Browser တွင် `http://localhost:5173` ဖွင့်ပြီး `Counter.okjs` ကို ပြင်ပါ။ Template၊ script သို့မဟုတ် scoped CSS သိမ်းတိုင်း Vite HMR ဖြင့် update ဖြစ်ပါမည်။

## 7. Production notes

HMR သည် development convenience ဖြစ်ပြီး production correctness အတွက် မလိုအပ်ပါ။ Production build တွင် Vite သည် `import.meta.hot` branch ကို မသုံးဘဲ component module ကို ပုံမှန် compile လုပ်ပါသည်။ User-provided HTML/template source ကို `.okjs` compiler ထဲသို့ တိုက်ရိုက် မထည့်သင့်ပါ။ OneKit template expressions သည် restricted AST evaluator နှင့် URL/HTML sanitization policy အောက်တွင် အလုပ်လုပ်သော်လည်း source file ကို trusted application code အဖြစ် သတ်မှတ်ရပါမည်။

### References

[1]: https://vite.dev/guide/api-plugin "Vite Plugin API"
[2]: https://vite.dev/guide/api-hmr "Vite Hot Module Replacement API"
[3]: https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide "VS Code Syntax Highlight Guide"
