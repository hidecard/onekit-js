# OneKit V3 Official Integration Packages

The V3 integration packages are deliberately separate from `onekit-js` core. Each package wraps an application-provided vendor client and maps it to an explicit OneKit contract. This keeps the core Fetch/edge runtime portable and prevents an optional vendor SDK from becoming a transitive dependency for every application.

## Package matrix

| Package | Vendor surface | OneKit capability | Runtime boundary |
|---|---|---|---|
| `@onekit-js/redis` | node-redis-compatible client | Serialized ISR cache and cross-instance regeneration lease | Node/server runtimes; the application owns connection lifecycle |
| `@onekit-js/deno-kv` | `Deno.Kv`-compatible client | Serialized ISR cache and atomic expiring regeneration lease | Deno/Deno Deploy; the runtime owns KV availability and expiration |
| `@onekit-js/vercel-global-config` | `@vercel/global-config`-compatible read client | Read-only runtime configuration | Node, edge, or browser-compatible server code; the application owns secret injection |

## Redis

Redis's official Node guidance documents `redis`/node-redis as an async client with `get`, `set`, `del`, and scan operations.[1] The OneKit package uses a structural client interface instead of importing the SDK. The complete factory requires `get`, `set`, `del`, `scanIterator`, and `eval`; storage-only use can omit scanning, but the lock requires token-checked script execution.

```ts
import { createClient } from 'redis';
import { createRedisISRAdapters } from '@onekit-js/redis';

const client = createClient({ url: process.env.REDIS_URL });
await client.connect();
const { cache, lock } = createRedisISRAdapters(client, {
  cacheKeyPrefix: 'site:isr:',
  lockKeyPrefix: 'site:isr:lock:',
  defaultLeaseMs: 30_000,
});
```

The lease uses `SET NX PX` and a token-checked release script. Redis provides the lease expiry and durability; OneKit does not claim to configure clustering, Sentinel, retry policy, or connection pooling.

## Deno KV

Deno documents KV keys as arrays, `list` as an async iterator, and atomic operations as explicit `check`/mutation/`commit` sequences.[2] The OneKit adapter uses these primitives directly. Cache entries use a namespaced key tuple, while lease acquisition checks a null versionstamp and writes a token with `expireIn`. Release checks the current versionstamp and token before deleting.

```ts
import { createDenoKVISRAdapters } from '@onekit-js/deno-kv';

const kv = await Deno.openKv();
const { cache, lock } = createDenoKVISRAdapters(kv, {
  cacheKeyPrefix: 'site:isr:',
  lockKeyPrefix: 'site:isr:lock:',
  defaultLeaseMs: 30_000,
});
```

Strong consistency is the default because stale reads are unsafe for lock coordination. Applications may explicitly select eventual consistency for cache lookup if they accept that trade-off.

## Vercel Global Config

Vercel's current documentation states that Edge Config was renamed to **Global Config**, with `@vercel/global-config` as the current SDK and `@vercel/edge-config` retained for legacy compatibility.[3] Global Config is a globally replicated, read-optimized configuration store, and the official SDK is read-only.[4]

```ts
import { createClient } from '@vercel/global-config';
import { createVercelGlobalConfigReader } from '@onekit-js/vercel-global-config';

const config = createVercelGlobalConfigReader({
  createClient,
  connectionString: process.env.GLOBAL_CONFIG,
});
const feature = await config.get<{ enabled: boolean }>('feature');
```

This package intentionally does not implement an ISR cache or lock on top of Global Config. Page persistence and regeneration exclusion should use Redis, Deno KV, or another storage/lock provider designed for writes and conditional ownership.

## Ownership and production requirements

The packages do not hide provider connection management, retries, timeouts, tracing, deployment manifests, secret rotation, or provider billing. Before production use, an application should test provider outage behavior, lease expiry, clock-independent ownership, cache invalidation, and graceful shutdown under its chosen runtime.

> These packages are official OneKit adapters, not claims of React, Next.js, Express, or vendor-platform feature parity. They expose the subset of each provider that maps cleanly to OneKit's explicit contracts.

## References

[1]: https://redis.io/tutorials/develop/node/gettingstarted/ "Redis: Getting Started with Node and Redis"

[2]: https://docs.deno.com/deploy/kv/ "Deno KV Quick Start"

[3]: https://vercel.com/docs/global-config/migration-guide "Vercel: Migrating from Edge Config to Global Config"

[4]: https://vercel.com/docs/global-config/global-config-sdk "Vercel: Global Config SDK"
