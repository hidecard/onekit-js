# OneKit JS V3 — Prerender and SSG Contract

## Scope

OneKit’s prerender contract is an explicit build-time utility for generating HTML from a finite list of concrete URL paths. It reuses the existing `renderToString()` behavior and lets the application provide the route-to-view renderer. It does not add filesystem access to the browser runtime, infer dynamic parameter values, or silently compose layouts, middleware, authorization, or data loaders.

## Core lifecycle

The application supplies concrete paths and a renderer. OneKit processes paths in deterministic lexical order, creates an abort signal for the run, renders each path, normalizes `VNode`/string/`RenderResult` output to HTML, and returns `PrerenderedPage` records. A page callback may persist or transform each record. If the signal is aborted, no later page starts and the operation rejects with the abort reason.

| Responsibility | Owner |
|---|---|
| Selecting concrete dynamic paths | Application or build integration |
| Route authorization and data access | Application renderer and its adapters |
| Layout and middleware composition | Application composition code |
| HTML escaping and SSR rendering | OneKit `renderToString()` |
| Writing files or uploading artifacts | Application callback or opt-in Vite output integration |
| Cache invalidation and deployment | Application/deployment platform |

## Core API shape

```ts
const pages = await prerenderRoutes({
  paths: ['/', '/about', '/docs/getting-started'],
  render: ({ path, signal }) => renderApplicationPath(path, { signal }),
  onPage: page => writePage(page),
});
```

The `render` callback may return a `VNode`, a string, or an existing `RenderResult`. Existing SSR context values are preserved when a `RenderResult` is returned. The helper never serializes loader promises or component functions into the output.

## Vite integration

The Vite plugin accepts an optional `fileRoutes.prerender` configuration. Its `paths` value is a concrete list or an async build-time factory. Its `render` callback receives the path, abort signal, and generated file-route manifest. When `outputDir` is provided, the plugin writes `index.html` for `/` and `<path>/index.html` for other paths. The output filename is generated from a URL pathname and rejects traversal-shaped segments. `onPage` remains available for manifests, uploads, or custom output handling.

The integration is intentionally opt-in and build-time only. It does not guess dynamic route values, call route loaders automatically, inject middleware, or create a deployment server. Applications must validate authorization-sensitive paths before adding them to the prerender list.

## Request-time ISR

For request-time incremental regeneration, use `createISRRenderer()` from `onekit-js/isr` with an injectable `ISRCache`. A fresh entry is returned as a hit; an expired entry is returned immediately as stale while one single-flight background regeneration runs; and a missing entry is rendered synchronously. Page `tags` and `revalidate` values are shared with the existing QueryClient vocabulary, and `revalidateTag()` can invalidate matching QueryClient records as well as regenerate matching pages. The memory cache is a reference implementation and does not provide distributed locking, persistence, eviction, encryption, or deployment coordination.

```ts
const pages = createISRRenderer({
  cache: createMemoryISRCache(),
  revalidate: 60_000,
  tags: path => path.startsWith('/docs') ? ['docs'] : ['shell'],
  render: ({ path, signal }) => renderApplicationPath(path, { signal }),
});

const response = await pages.renderISRPage('/docs/start');
if (response.revalidation) await response.revalidation;
```

Applications own authentication, cache storage, distributed coordination, webhook verification, and response headers. ISR is a server/deployment adapter contract, not a browser persistence mechanism.

## Non-goals and future work

This contract does not promise a distributed or persistent cache, preview deployments, asset manifest rewriting, sitemap generation, framework-owned deployment routing, or automatic deployment coordination. The ISR primitives provide single-process cache-aware regeneration; production durability, locking, eviction, observability, and platform-specific headers require an adapter. It also does not provide React Server Components, Flight payloads, Server Functions, or automatic client bundle splitting.
