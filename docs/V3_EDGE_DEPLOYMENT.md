# OneKit JS V3 — Deployment Adapter and Edge Runtime Contract

## Purpose

The edge integration keeps `ServerApp.handle(request)` as the canonical Fetch-compatible application boundary and adds a thin `createEdgeHandler()` wrapper for runtimes such as Workers, Deno Deploy, and Vercel Edge. The wrapper does not import Node modules, translate Node request streams, or select a vendor SDK. Vendor entrypoints may pass their platform execution context and use `waitUntil()` for non-critical work.

| Capability | Required for edge handler | Contract |
|---|---:|---|
| Fetch `Request`/`Response`/`Headers`/`URL` | Yes | Requests are passed to `ServerApp.handle()` without a Node translation layer. |
| `AbortController`/`AbortSignal` | Yes | The request signal is preserved by the Fetch runtime and application handlers should propagate it to loaders/renderers. |
| Web Streams | Yes for streaming | Streaming bodies are returned unchanged; the adapter must not call `arrayBuffer()` or buffer the response. |
| `TextEncoder` | Yes for JSON/signing paths | OneKit uses it for compatible text conversion; platform crypto remains the runtime’s responsibility. |
| Web Crypto SubtleCrypto | Required only for signing | Secure route-data signing is optional; fail closed if a signer is requested but unavailable. |
| `waitUntil()` | Optional | The adapter may register ISR refresh, telemetry, or cleanup promises. These tasks must not delay the response or receive secrets outside application policy. |

## Example

```ts
const app = createServerApp();
app.get('/health', context => context.json({ ok: true }));

const edge = createEdgeHandler(app, {
  onError: error => console.error('edge request failed', error),
});

export default {
  async fetch(request: Request, env: unknown, executionContext: EdgeExecutionContext) {
    return edge.fetch(request, { env, executionContext });
  },
};
```

## Streaming and cancellation

`createEdgeHandler()` returns the `Response` from `ServerApp.handle()` directly, including a `ReadableStream` body. It never buffers the response. An application-owned renderer should receive `request.signal`; if the client disconnects or a platform deadline aborts the request, the renderer should stop work and close or abort its stream. Background work registered through `waitUntil()` is separate from the response lifetime. The adapter’s `schedule(promise, context)` helper forwards a promise to the platform execution context and is suitable for ISR `scheduleRevalidation` or telemetry tasks. For example, an application can configure `scheduleRevalidation: (promise, path) => edge.schedule(promise, { env, executionContext })` while rendering a request.

## Runtime checks

`detectEdgeRuntime()` reports feature availability without assuming a vendor. `assertEdgeRuntime()` can fail at startup when required capabilities are absent. A Node process with Fetch APIs is not automatically classified as an edge runtime, and a browser is not a deployment adapter. These checks are diagnostics, not security boundaries.

## Ownership and non-goals

The adapter does not provide routing deployment, secrets management, durable objects, KV/database bindings, CDN cache headers, ISR locking, logs, tracing, or vendor-specific environment typing. Applications own authentication, authorization, origin policy, response headers, cache policy, and platform bindings. The Node HTTP bridge remains a separate Node-only adapter.

This increment improves OneKit’s edge compatibility and provides a deployment adapter seam; it does not claim that every OneKit API is edge-safe. Node-only APIs such as `createNodeHandler()`, filesystem-backed Vite build hooks, and vendor database drivers must remain outside edge entrypoints.
