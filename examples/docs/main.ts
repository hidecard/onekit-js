/* Style philosophy: OneKit-only browser manual. State, effects, filtering, and DOM updates are driven by OneKit APIs; no React, Vue, or UI framework. */
import { computed, effect, nextTick, reactive, watch } from "../../src/index.ts";

type Topic = {
  id: string;
  area: string;
  title: string;
  summary: string;
  signature: string;
  example: string;
};

const topics: Topic[] = [
  { id: "reactive", area: "STATE", title: "Reactive state", summary: "Proxy-based state that reads like plain JavaScript and updates subscribed effects.", signature: "reactive(object)", example: "const state = reactive({ count: 0 });" },
  { id: "effect", area: "STATE", title: "Effects", summary: "Run a DOM or side-effect function whenever the reactive values it reads change.", signature: "effect(fn)", example: "effect(() => output.textContent = String(state.count));" },
  { id: "computed", area: "STATE", title: "Computed values", summary: "Derive lazy values with a stable .value property and dependency tracking.", signature: "computed(getter)", example: "const total = computed(() => cart.price * cart.quantity);" },
  { id: "component", area: "VIEW", title: "Components", summary: "Define, register, create, mount, update, and unmount component instances.", signature: "defineComponent(options)", example: "const Card = defineComponent({ name: \"Card\", render() { return \"<article />\"; } });" },
  { id: "template", area: "VIEW", title: "Templates", summary: "Compile interpolation and event directives into DOM elements without a virtual runtime requirement.", signature: "compileTemplate(source, context)", example: "compileTemplate('<button @click=\"save\">{{label}}</button>', ctx);" },
  { id: "router", area: "APP", title: "Router", summary: "Map browser paths to views with navigation guards and a small imperative API.", signature: "createRouter(routes)", example: "const router = createRouter([{ path: '/', component: Home }]);" },
  { id: "store", area: "APP", title: "Stores", summary: "Keep shared state and actions in a named store that can be consumed by multiple views.", signature: "defineStore(name, options)", example: "const useTasks = defineStore('tasks', { state: () => ({ items: [] }) });" },
  { id: "ssr", area: "PLATFORM", title: "SSR utilities", summary: "Render application output on the server and hydrate it in the browser when needed.", signature: "renderToString(app)", example: "const html = await renderToString(App);" },
  { id: "plugin", area: "PLATFORM", title: "Plugins", summary: "Extend an application through installable capabilities with explicit lifecycle boundaries.", signature: "app.use(plugin)", example: "app.use(loggingPlugin({ level: 'info' }));" },
  { id: "cli", area: "DELIVERY", title: "CLI workflow", summary: "Create a starter project and build a production bundle with the included CLI.", signature: "onekit create | build", example: "npx --yes --package=onekit-js onekit create my-app" },
  { id: "testing", area: "DELIVERY", title: "Testing", summary: "Keep state transitions and component contracts covered with small deterministic tests.", signature: "npm test", example: "npm run type-check && npm test -- --runInBand" },
  { id: "security", area: "DELIVERY", title: "Security", summary: "Validate external data and keep untrusted HTML out of templates and render contexts.", signature: "validate(input)", example: "const safe = schema.parse(untrustedInput);" },
];

const state = reactive({ query: "", area: "ALL", count: 0, copied: "" });
const visibleTopics = computed(() => topics.filter((topic) => {
  const needle = state.query.trim().toLowerCase();
  const matchesArea = state.area === "ALL" || topic.area === state.area;
  const matchesQuery = !needle || `${topic.title} ${topic.summary} ${topic.signature}`.toLowerCase().includes(needle);
  return matchesArea && matchesQuery;
}));

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("OneKit docs mount point #app was not found");

function topicCard(topic: Topic) {
  return `<article class="topic-card" id="${topic.id}"><div class="topic-meta"><span>${topic.area}</span><span>V3.1.12</span></div><h3>${escapeHtml(topic.title)}</h3><p>${escapeHtml(topic.summary)}</p><code>${escapeHtml(topic.signature)}</code><pre>${escapeHtml(topic.example)}</pre></article>`;
}

function render() {
  const topicsHtml = visibleTopics.value.map(topicCard).join("");
  app.innerHTML = `<div class="manual-shell">
    <header class="topbar"><a class="brand" href="#top"><span class="brand-mark"><i></i><b>+</b></span><span>ONEKIT <em>JS</em></span></a><div class="version">V3.1.12 / FIELD MANUAL</div><button class="menu-button" data-action="menu" aria-label="Toggle navigation">☰</button></header>
    <aside class="sidebar"><div class="sidebar-caption">ONEKIT / DOCS</div><nav><a href="#top">01 / Overview</a><a href="#install">02 / Install</a><a href="#catalog">03 / API catalog</a><a href="#playground">04 / Playground</a><a href="#release">05 / Release</a></nav><div class="sidebar-footer">MIT LICENSE<br />BROWSER-FIRST</div></aside>
    <main id="top" class="content"><section class="hero"><p class="eyebrow">› OneKit JS / V3.1.12</p><h1>One manual.<br /><em>Every surface.</em></h1><p class="lede">A documentation page built with the runtime it documents. Reactive state powers the filters, navigation, and live specimen below.</p><div class="hero-tags"><span>TypeScript-first</span><span>SSR-ready</span><span>Zero UI framework</span></div></section>
      <section id="install" class="install-panel"><div><p class="eyebrow">› first contact</p><h2>Install the small runtime.</h2><p>Start with the public package entry point. Add only the primitives your application needs.</p></div><div class="commands"><button data-copy="npm install onekit-js"><b>$</b> npm install onekit-js <span>copy</span></button><button data-copy="npx --yes --package=onekit-js onekit create my-app"><b>$</b> npx --yes --package=onekit-js onekit create my-app <span>copy</span></button></div></section>
      <section id="catalog" class="catalog"><div class="section-head"><div><p class="eyebrow">› API catalog</p><h2>Find the right<br /><em>primitive.</em></h2></div><p class="section-note">Search the complete V3 surface or narrow it by state, view, platform, and delivery.</p></div><div class="controls"><label class="search"><span>/</span><input data-query type="search" placeholder="Search reactive, router, SSR..." value="${escapeHtml(state.query)}" /></label><div class="filters">${["ALL", "STATE", "VIEW", "APP", "PLATFORM", "DELIVERY"].map((area) => `<button data-area="${area}" class="${state.area === area ? "active" : ""}">${area}</button>`).join("")}</div></div><div class="result-line"><span>${visibleTopics.value.length} surfaces indexed</span><span>onekit-js / src / modules</span></div><div class="topic-grid">${topicsHtml || `<div class="empty">No surface matches that query. Try <button data-clear>clear</button>.</div>`}</div></section>
      <section id="playground" class="playground"><div><p class="eyebrow">› live specimen</p><h2>State that<br /><em>moves.</em></h2><p>Change the state and OneKit's effect flushes the DOM. No component wrapper is required for the first useful interaction.</p></div><div class="specimen"><div class="specimen-top"><span>REACTIVE / 001</span><span class="live">● ONLINE</span></div><div class="counter-value">${state.count}</div><div class="counter-actions"><button data-action="decrement">−</button><button data-action="increment">+ increment</button><button data-action="reset">reset</button></div><code>state.count → effect() → DOM</code><p class="tick-note">nextTick queue: ready for the next microtask</p></div></section>
      <section id="release" class="release"><p class="eyebrow">› ship it</p><h2>Read the source.<br /><em>Build your own.</em></h2><div class="release-grid"><p>Use the CLI to scaffold, the API catalog to choose primitives, and the source to understand the contract. Keep the runtime small; make the product yours.</p><div><a href="../../README.md">Read local README ↗</a><a href="../../docs/V3_USAGE.md">Open V3 usage guide ↗</a></div></div></section>
    </main><footer class="footer">ONEKIT JS / V3.1.12 <span>Documentation example built with reactive(), computed(), effect(), and nextTick().</span></footer></div>`;
}

function copyText(value: string) {
  navigator.clipboard?.writeText(value);
  state.copied = value;
  window.setTimeout(() => { if (state.copied === value) state.copied = ""; }, 1000);
}

document.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const area = target.closest<HTMLButtonElement>("[data-area]");
  if (area) state.area = area.dataset.area ?? "ALL";
  const copy = target.closest<HTMLButtonElement>("[data-copy]");
  if (copy) copyText(copy.dataset.copy ?? "");
  const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (action === "increment") state.count += 1;
  if (action === "decrement") state.count -= 1;
  if (action === "reset") state.count = 0;
  if (target.closest("[data-clear]")) { state.query = ""; state.area = "ALL"; }
  if (action === "menu") document.querySelector(".sidebar")?.classList.toggle("open");
  if (action === "increment") await nextTick();
});

document.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.matches("[data-query]")) state.query = input.value;
});

watch(() => state.count, (next) => {
  document.title = `OneKit V3 — Count ${next}`;
});

effect(render);
