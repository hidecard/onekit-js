# OneKit JS V3 — ISR and Cache-Aware Revalidation

## Scope

The ISR contract adds a small adapter-neutral page cache around `prerenderRoutes()`-style render callbacks. It supports cache hits, stale-while-revalidate responses, explicit path regeneration, tag invalidation, single-flight protection, optional adapter-owned regeneration leases, and structured lifecycle events. It is designed for server runtimes and build/deployment adapters; the included memory cache remains single-process, while durable/distributed behavior is supplied through application adapters.

## Lifecycle

A request calls `renderISRPage(path)`. A fresh cached page is returned as a `hit`. A stale cached page is returned immediately as `stale` while one background regeneration is scheduled. A missing page is rendered synchronously as a `miss`. Concurrent requests for the same missing or stale path share one regeneration promise. The renderer receives an `AbortSignal` and may return a VNode, string, or existing SSR `RenderResult`.

| Concern | Contract |
|---|---|
| Freshness | `revalidate` is a non-negative millisecond interval. `revalidate: 0` means immediately stale after generation. |
| Tags | Page entries may carry `tags`; invalidating a tag marks matching entries stale without transferring page data. |
| Regeneration | `revalidatePath(path)` forces one synchronous regeneration; concurrent calls are single-flight. |
| Stale requests | `renderISRPage()` returns the last good page and exposes the background `revalidation` promise for observability/tests. |
| Failures | A failed refresh keeps the previous good page and surfaces the error through the returned revalidation promise; a missing-page failure rejects the request. |
| Storage | `ISRCache` is injectable. The memory cache is a reference implementation only; durable persistence, eviction, and distributed behavior belong to the adapter. |
| Distributed lock | Optional `ISRCacheLock.acquire(path, { signal, leaseMs })` returns a lease with `release()`. A missing lease fails closed with `ISRLockUnavailableError`; the adapter owns lease expiry and cross-instance correctness. |
| Scheduling | `scheduleRevalidation(promise, path)` can forward stale refreshes to a platform hook such as `executionContext.waitUntil()`. The response does not wait for a stale refresh. |
| Observability | `onEvent()` receives hit/miss/stale, regeneration start/success/failure, and lock-unavailable events. Diagnostic callback failures are isolated from rendering. |
| Query coordination | A shared tag can be forwarded to an optional `QueryClient`; OneKit invalidates the query tag but does not silently fetch application data outside the renderer. |

## Example

```ts
const renderer = createISRRenderer({
  cache: durableCache,
  lock: distributedLock,
  lockLeaseMs: 15_000,
  revalidate: 60_000,
  tags: path => path.startsWith('/docs') ? ['docs'] : ['shell'],
  scheduleRevalidation: (promise) => executionContext.waitUntil(promise),
  onEvent: event => metrics.record('isr', event),
  render: ({ path, signal }) => renderPath(path, { signal }),
});

const first = await renderer.renderISRPage('/docs/start'); // miss
const second = await renderer.renderISRPage('/docs/start'); // hit
await renderer.revalidateTag('docs');
const third = await renderer.renderISRPage('/docs/start'); // stale + background refresh
await third.revalidation;
```

## Security and ownership

The cache must not be used as an authorization boundary. Applications must select safe paths, keep secrets out of HTML and cache entries, and choose storage isolation appropriate for their deployment. The memory cache has no cross-process coordination, persistence, encryption, eviction limit, or replay protection. Lock adapters must define lease expiry and failure behavior; event sinks must avoid recording secrets. ISR, asset publication, invalidation webhooks, and deployment routing remain application-owned.

## Non-goals

This increment does not provide a built-in durable cache, distributed lock implementation, background worker, stale-if-error HTTP header policy, preview mode, on-demand webhook authentication, asset manifest rewriting, sitemap generation, RSC/Flight, Server Functions, or a vendor-specific Redis/CDN adapter. Those integrations remain application/deployment packages built against the contracts above.
