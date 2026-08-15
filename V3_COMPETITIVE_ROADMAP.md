# OneKit JS V3 Competitive Roadmap

## Executive position

OneKit JS V3 သည် React၊ Vue နှင့် Svelte တို့ကို feature အရ တိုက်ရိုက်အစားထိုးမည့် framework ဖြစ်လာရန်ထက် **fine-grained reactive kernel + strict lifecycle ownership + secure template execution + transparent runtime diagnostics** ကို တစ်စုတစ်စည်းတည်း ပေးနိုင်သည့် framework အဖြစ် position လုပ်သင့်သည်။ “React ထက် အမြဲမြန်သည်” ဟူသော အထောက်အထားမရှိသေးသည့် claim ထက် “large SPA များတွင် state ownership၊ teardown နှင့် runtime observability ကို first-class အဖြစ် စီမံနိုင်သည်” ဟူသော claim သည် ပိုမိုကာကွယ်နိုင်ပြီး niche တစ်ခုကို ပြတ်သားစေသည်။

> **Proposed OneKit V3 promise:** “Small, predictable DOM updates with explicit ownership, safe templates, and inspectable lifecycles.”

## Current architecture audit

V3 တွင် reactive core သည် nested proxy caching၊ property-level dependency tracking၊ effect cleanup၊ batching၊ computed/watch နှင့် scope-aware teardown တို့ကို ပံ့ပိုးထားသည်။ ထို့ကြောင့် OneKit ၏ အဓိက technical asset သည် reactive kernel ဖြစ်သည်။ `effectScope`၊ `onScopeDispose`၊ resource registration နှင့် development leak diagnostics များက lifecycle ownership ကို အခြေခံအဆင့်တွင် ရှိပြီးသားဖြစ်စေသည်။

သို့သော် renderer သည် ယခုအချိန်တွင် component update အတွက် template ကို HTML string အဖြစ် ပြန်ထုတ်ပြီး temporary DOM container ဖြင့် parse လုပ်ကာ root element ကို replace လုပ်သည့် coarse-grained လမ်းကြောင်းရှိနေသည်။ ထို့ကြောင့် reactive core သည် fine-grained ဖြစ်နေသော်လည်း DOM renderer သည် signal-to-node precision ကို မရသေးပါ။ “zero-overhead fine-grained rendering” ကို public claim မလုပ်မီ renderer ကို အဓိက ပြန်တည်ဆောက်ရမည်။

Template ဘက်တွင် restricted AST evaluator၊ dangerous identifiers/properties deny-list နှင့် HTML sanitizer ရှိပြီးသားဖြစ်သည်။ ယင်းသည် `new Function` မသုံးသော security foundation ကောင်းတစ်ခုဖြစ်သော်လည်း safe evaluator က input ကိုသာ ကန့်သတ်ပေးပြီး developer သုံးသည့် arbitrary directive handler သည် security boundary မဟုတ်သေးပါ။ Trusted template နှင့် untrusted content ကို API အဆင့်တွင် ခွဲခြားပေးရမည်။

DevTools နှင့် Vite HMR foundation များလည်း ရှိပြီးသားဖြစ်သော်လည်း DevTools event history သည် dependency graph၊ component tree traversal နှင့် leak root-cause analysis အထိ မရောက်သေးပါ။ Vite plugin သည် update event ကို ကြေညာပြီး module state preservation ကို ပံ့ပိုးသော်လည်း component-level state transfer နှင့် stale effect detection ကို runtime နှင့် ချိတ်ဆက်ရန် လိုအပ်သည်။

## Four strategic pillars

| Pillar | V3 ရှိပြီးသား အားသာချက် | အဓိက gap | အောင်မြင်မှု သတ်မှတ်ချက် |
|---|---|---|---|
| **1. Reactive rendering** | Proxy reactivity၊ batching၊ computed/watch၊ effect cleanup | Component update သည် root replacement ဖြစ်နေဆဲ | Unrelated DOM nodes မပြောင်းဘဲ changed binding node များသာ patch ဖြစ်ခြင်း |
| **2. Ownership and DX** | `effectScope`၊ disposal၊ leak warnings၊ Vite HMR foundation | Component/store/effect ownership graph မပြည့်စုံ | Unmount တစ်ကြိမ်နှင့် effects/listeners/resources အားလုံး teardown ဖြစ်ခြင်း |
| **3. Safety and resilience** | Restricted expression AST၊ sanitizer၊ error boundary API | Trusted/untrusted HTML distinction နှင့် boundary integration မပြည့်စုံ | Forbidden expression၊ unsafe URL/attribute၊ render error တို့အတွက် deterministic test coverage |
| **4. Evidence and ecosystem** | Local benchmark နှင့် DevTools bridge | Cross-framework reproducible benchmark မရှိသေး | Same-machine benchmark protocol၊ raw results၊ CI artifact နှင့် fair interpretation |

## Pillar 1: Fine-grained renderer

### Recommended architecture

Template compilation ကို string replacement အဖြစ် မထားဘဲ **static DOM skeleton + binding instruction table** အဖြစ် ပြောင်းလဲသင့်သည်။ Compiler သည် အောက်ပါ instruction များကို ထုတ်ပေးမည်။

```ts
interface BindingInstruction {
  kind: 'text' | 'attribute' | 'property' | 'class' | 'style' | 'event' | 'if' | 'for';
  nodePath: number[];
  expression?: string;
  event?: string;
  modifiers?: string[];
}

interface CompiledTemplate {
  create(document: Document): DocumentFragment;
  bindings: BindingInstruction[];
}
```

Mount အချိန်တွင် node path များကို တစ်ကြိမ် resolve လုပ်ပြီး binding တစ်ခုချင်းစီအတွက် effect တစ်ခု သို့မဟုတ် scheduler job တစ်ခုသာ ဖန်တီးရမည်။ `textContent`၊ `setAttribute`၊ DOM property နှင့် event listener တို့ကို operation တစ်ခုချင်းစီအလိုက် update လုပ်ပြီး root replacement ကို မသုံးသင့်ပါ။ `ok-for` အတွက် keyed reconciliation နှင့် stable item scope လိုအပ်သည်။

### Public API direction

```ts
const app = createApp({
  template: '<button ok-on:click="count++">{{ count }}</button>',
  setup() {
    return { count: signal(0) };
  },
});

app.mount('#app');
```

အတွင်းပိုင်းတွင် Proxy API ကို ဆက်လက်ထိန်းသိမ်းနိုင်သော်လည်း high-frequency UI state အတွက် `signal()`၊ `computed()` နှင့် `effect()` ကို explicit primitive အဖြစ် ပေးသင့်သည်။ Proxy API သည် ergonomic state model ဖြစ်ပြီး signal API သည် predictable subscription boundary ဖြစ်သင့်သည်။

### Success criteria

| Measure | Target for V3.2/V3.3 |
|---|---:|
| Single text binding update | One text node mutation; no root replacement |
| Unrelated sibling mutation | Zero |
| Batched writes | One scheduled flush per batch |
| Keyed list reorder | DOM node identity preserved |
| Teardown after unmount | Zero active effects/listeners owned by component |

## Pillar 2: Lifecycle ownership, HMR, and DevTools

Every component, store, directive, event listener, watcher, async task, and HMR resource should be registered against an owner scope. The recommended internal model is a parent-child ownership tree:

```text
Application scope
├── Router scope
├── Component scope
│   ├── Render effects
│   ├── Event listeners
│   └── Async resources
└── Store scope
    └── Store subscribers
```

DevTools events should use stable IDs and explicit ownership edges. The next event schema should add `ownerId`၊ `parentId`၊ `resourceType`၊ `createdAt` နှင့် `disposedAt` fields. This makes a dangling effect explainable rather than merely warning that an effect exists.

```ts
interface ResourceLifecycleEvent {
  type: 'resource:lifecycle';
  resourceId: string;
  ownerId: string;
  resourceType: 'effect' | 'watch' | 'listener' | 'store' | 'async';
  phase: 'create' | 'dispose' | 'leak';
  timestamp: number;
}
```

HMR တွင် module state preservation ကို component instance state၊ scope identity နှင့် render function replacement သို့ ချဲ့သင့်သည်။ State ကို preserve လုပ်နိုင်သော်လည်း old render effect နှင့် listener များသည် မကျန်စေရန် dispose-before-accept protocol သတ်မှတ်ရမည်။

## Pillar 3: Security and error boundaries

Restricted AST evaluator ကို ဆက်လက်အသုံးပြုသင့်ပြီး grammar ကို documented allow-list အဖြစ် သတ်မှတ်ရမည်။ အထူးသဖြင့် `globalThis`၊ `window`၊ `document`၊ `Function`၊ `eval`၊ `constructor`၊ prototype traversal နှင့် arbitrary assignment များကို deny လုပ်ထားရမည်။ Attribute binding တွင် `href`၊ `src`၊ `srcdoc`၊ `style` နှင့် event attributes ကို သီးခြား policy ဖြင့် စစ်ဆေးရမည်။

Untrusted user content အတွက် `html` directive မပေးသင့်ဘဲ safe default သည် `textContent` ဖြစ်ရမည်။ Raw HTML လိုအပ်ပါက `trustedHTML()` သို့မဟုတ် policy object တစ်ခုကို explicit အဖြစ် တောင်းသင့်သည်။ Sanitizer ကို security guarantee တစ်ခုတည်းအဖြစ် မကြေညာဘဲ CSP၊ Trusted Types နှင့် server-side validation တို့နှင့် ပေါင်းစပ်အသုံးပြုရန် documentation တွင် ရှင်းပြရမည်။

Error boundary သည် API အဖြစ် ရှိပြီးသားဖြစ်သောကြောင့် component rendering နှင့် router loader pipeline သို့ integrate လုပ်ရန် ဦးစားပေးသင့်သည်။ Error တစ်ခုကို console သို့ပို့ရုံမဟုတ်ဘဲ boundary tree တွင် nearest fallback ကို ရွေး၊ failed scope ကို dispose၊ reset ခေါ်သည့်အခါမှသာ controlled retry လုပ်သင့်သည်။

```ts
const boundary = createErrorBoundary({
  fallback: (error, reset) => renderErrorCard(error, reset),
  onError: (error, context) => reportError(error, context),
});

const view = boundary.render(() => renderRoute(route), 'route-render');
```

## Pillar 4: Benchmark and standardisation

OneKit သည် React၊ Vue သို့မဟုတ် Svelte ထက် အမြဲမြန်သည်ဟု benchmark မပြမီ claim မလုပ်သင့်ပါ။ Official [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark) သည် randomized table workloads၊ DOM operations နှင့် memory-related measurements များအတွက် community standard တစ်ခုဖြစ်သော်လည်း benchmark result သည် workload၊ browser၊ machine နှင့် implementation quality ပေါ်တွင် မူတည်သည်။ Official results page သည် weighted geometric mean ဖြင့် overall result ကို တွက်ချက်သောကြောင့် raw results များကိုလည်း အတူတင်ပြရမည်။

### Required benchmark protocol

| Rule | Requirement |
|---|---|
| Environment | Pinned Chromium version၊ Node version၊ OS နှင့် CPU/RAM record |
| Workload | JS Framework Benchmark-compatible CRUD/table cases နှင့် OneKit-specific lifecycle cases |
| Baseline | React၊ Vue၊ Svelte versions ကို lockfile ဖြင့် pin လုပ်ခြင်း |
| Measurements | Duration၊ DOM mutations၊ heap usage၊ bundle size၊ startup time၊ teardown residuals |
| Repetitions | Warm-up runs ဖယ်ပြီး repeated runs နှင့် confidence interval report |
| Artifact | Raw JSON၊ harness version၊ commit SHA နှင့် rendered summary ကို CI artifact အဖြစ် သိမ်းခြင်း |
| Interpretation | Mean တစ်ခုတည်းမဟုတ်ဘဲ p50/p95၊ memory၊ correctness နှင့် variance ကို အတူပြခြင်း |

လက်ရှိ `scripts/benchmark-v3.mjs` သည် reactive kernel benchmark အတွက် ကောင်းမွန်သော်လည်း cross-framework benchmark မဟုတ်သေးပါ။ ပထမ milestone တွင် kernel benchmark နှင့် renderer benchmark ကို ခွဲထားပြီး၊ ဒုတိယ milestone တွင် official benchmark adapter တည်ဆောက်သင့်သည်။

## Recommended delivery sequence

| Release | Deliverable | Why first |
|---|---|---|
| **V3.2** | Binding instruction compiler၊ direct text/attribute updates၊ component scope ownership၊ security regression suite | Core product claim ကို renderer level တွင် အမှန်တကယ်ဖြစ်စေသည် |
| **V3.3** | Keyed list reconciliation၊ boundary-to-renderer integration၊ dependency/resource graph events | Large SPA reliability နှင့် recoverability တိုးစေသည် |
| **V3.4** | DevTools dependency graph၊ leak panel၊ HMR component state transfer | Developer trust နှင့် debugging advantage တည်ဆောက်သည် |
| **V3.5** | Official benchmark adapter၊ reproducible CI artifacts၊ performance dashboard | Claims ကို independent, repeatable evidence ဖြင့် ထောက်ခံသည် |

## What OneKit should not do

OneKit သည် React ၏ ecosystem အကျယ်အဝန်း၊ Vue ၏ batteries-included conventions နှင့် Svelte ၏ compiler ecosystem တို့ကို တစ်ပြိုင်နက်တည်း ကူးယူရန် မကြိုးစားသင့်ပါ။ ထိုသို့လုပ်ပါက API များ မတည်ငြိမ်ဘဲ ecosystem မပြည့်စုံသော general-purpose framework တစ်ခု ဖြစ်နိုင်သည်။

အစား **embedded widgets၊ dashboards၊ long-lived SPA shells၊ micro-frontends နှင့် resource-sensitive applications** များအတွက် ownership၊ teardown၊ deterministic updates နှင့် runtime inspection ကို အဓိကထားသော niche ကို ရွေးသင့်သည်။ အဆိုပါ niche တွင် “smallest possible update” ထက် “smallest observable and safely owned update” သည် OneKit ၏ ပိုမိုထူးခြားသည့် message ဖြစ်နိုင်သည်။

## Immediate engineering backlog

1. Component update path တွင် root replacement ကို ဖယ်ရှားပြီး text/attribute binding တစ်ခုချင်းစီကို patch လုပ်မည့် prototype တည်ဆောက်ပါ။
2. Component unmount test တစ်ခုတွင် effects၊ watchers၊ listeners၊ store subscriptions နှင့် async cleanup အားလုံးကို count-based assertion ဖြင့် စစ်ပါ။
3. DevTools event schema တွင် `ownerId` နှင့် `resourceId` ထည့်ပြီး dependency/resource graph snapshot API ထုတ်ပါ။
4. `ok-bind` အတွက် URL/style/event security policies နှင့် forbidden-expression regression corpus တည်ဆောက်ပါ။
5. Error boundary ကို component render နှင့် router loader တို့တွင် integrate လုပ်ပြီး failed scope disposal နှင့် reset semantics ကို test လုပ်ပါ။
6. Renderer benchmark ကို raw JSON နှင့် CI artifact အဖြစ် ထုတ်ပြီး React/Vue/Svelte adapters များကို version-pinned သီးခြား project အဖြစ် ထည့်ပါ။

## References

[1]: https://github.com/krausest/js-framework-benchmark "krausest/js-framework-benchmark"
[2]: https://krausest.github.io/js-framework-benchmark/current.html "JS Framework Benchmark interactive results"
[3]: https://svelte.dev/blog/runes "Introducing runes — Svelte"
[4]: https://svelte.dev/docs/svelte/what-are-runes "What are runes? — Svelte documentation"
[5]: https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity "Fine-grained reactivity — Solid documentation"
