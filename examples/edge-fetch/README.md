# Edge Fetch adapter example

This example is intentionally vendor-neutral. It can be adapted to a Worker, Deno Deploy, Vercel Edge, or another runtime that exposes Fetch APIs and Web Streams.

```ts
import { createEdgeHandler } from 'onekit-js/edge';
import { createISRRenderer, createSerializedISRCache } from 'onekit-js/isr';
import { createServerApp } from 'onekit-js';

const app = createServerApp();
const edge = createEdgeHandler(app, { requireStreaming: true });

const renderer = createISRRenderer({
  cache: createSerializedISRCache(kvStore, { prefix: 'site:isr:' }),
  lock: distributedLock,
  render: ({ path, signal }) => renderPage(path, { signal }),
  scheduleRevalidation: (promise) => edge.schedule(promise, { env, executionContext }),
  onEvent: event => metrics.record('isr', event),
});

export default {
  async fetch(request: Request, env: unknown, executionContext: EdgeExecutionContext) {
    return edge.fetch(request, { env, executionContext });
  },
};
```

`kvStore`, `distributedLock`, `renderPage`, `metrics`, and `EdgeExecutionContext` are application/platform-owned placeholders. The core adapter does not select a KV provider, implement a distributed lock, add CDN cache headers, or decide how secrets and environment bindings are typed.

The handler delegates directly to `ServerApp.handle(request)`. Do not use `createNodeHandler()` in this entrypoint, and do not call `arrayBuffer()` on a streamed response when the platform supports Web Streams.
