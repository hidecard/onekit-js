# OneKit JS V3 — ISR and Cache-Aware Revalidation

## Scope

The ISR contract adds a small adapter-neutral page cache around `prerenderRoutes()`-style render callbacks. It supports cache hits, stale-while-revalidate responses, explicit path regeneration, tag invalidation, and single-flight protection. It is designed for server runtimes and build/deployment adapters; it does not make browser bundles persistent, provide a distributed cache, or claim Next.js-compatible ISR deployment behavior.

## Lifecycle

A request calls `renderISRPage(path)`. A fresh cached page is returned as a `hit`. A stale cached page is returned immediately as `stale` while one background regeneration is scheduled. A missing page is rendered synchronously as a `miss`. Concurrent requests for the same missing or stale path share one regeneration promise. The renderer receives an `AbortSignal` and may return a VNode, string, or existing SSR `RenderResult`.

| Concern | Contract |
|---|---|
| Freshness | `revalidate` is a non-negative millisecond interval. `revalidate: 0` means immediately stale after generation. |
| Tags | Page entries may carry `tags`; invalidating a tag marks matching entries stale without transferring page data. |
| Regeneration | `revalidatePath(path)` forces one synchronous regeneration; concurrent calls are single-flight. |
| Stale requests | `renderISRPage()` returns the last good page and exposes the background `revalidation` promise for observability/tests. |
| Failures | A failed refresh keeps the previous good page and surfaces the error through the returned revalidation promise; a missing-page failure rejects the request. |
| Storage | `ISRCache` is injectable. The memory cache is a reference implementation only; distributed persistence, locking, and eviction belong to the adapter. |
| Query coordination | A shared tag can be forwarded to an optional `QueryClient`; OneKit invalidates the query tag but does not silently fetch application data outside the renderer. |

## Example

```ts
const renderer = createISRRenderer({
  cache: createMemoryISRCache(),
  revalidate: 60_000,
  tags: path => path.startsWith('/docs') ? ['docs'] : ['shell'],
  render: ({ path, signal }) => renderPath(path, { signal }),
});

const first = await renderer.renderISRPage('/docs/start'); // miss
const second = await renderer.renderISRPage('/docs/start'); // hit
await renderer.revalidateTag('docs');
const third = await renderer.renderISRPage('/docs/start'); // stale + background refresh
await third.revalidation;
```

## Security and ownership

The cache must not be used as an authorization boundary. Applications must select safe paths, keep secrets out of HTML and cache entries, and choose storage isolation appropriate for their deployment. The memory cache has no cross-process coordination, persistence, encryption, eviction limit, or replay protection. ISR, asset publication, invalidation webhooks, and deployment routing remain application-owned.

## Non-goals

This increment does not implement incremental cache persistence, background workers, distributed locks, stale-if-error HTTP headers, preview mode, on-demand webhook authentication, asset manifest rewriting, sitemap generation, RSC/Flight, Server Functions, or a vendor-specific Redis/CDN adapter.
