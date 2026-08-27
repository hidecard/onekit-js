# @onekit-js/redis

Redis-backed adapters for OneKit JS ISR. This package provides a serialized ISR cache and a cross-instance regeneration lease for a connected **node-redis-compatible** client. It does not create, connect, or configure a Redis client for the application.

## Install

```bash
npm install onekit-js @onekit-js/redis redis
```

`redis` is an optional peer dependency because the adapter uses a small structural client interface and does not hard-code a client import.

## Usage

```ts
import { createClient } from 'redis';
import { createRedisISRAdapters } from '@onekit-js/redis';
import { ISRRenderer } from 'onekit-js/isr';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const { cache, lock } = createRedisISRAdapters(redis, {
  cacheKeyPrefix: 'my-app:isr:',
  lockKeyPrefix: 'my-app:isr:lock:',
  defaultLeaseMs: 30_000,
});

const renderer = new ISRRenderer({
  cache,
  lock,
  revalidate: 60,
  render: async context => renderPage(context),
});
```

The lock uses Redis `SET` with `NX` and `PX`, and token-checked `EVAL` release. Lease expiry and durability remain Redis responsibilities. The adapter fails closed when a lease cannot be acquired.

## Contract boundaries

The package does not claim to provide Redis cluster configuration, connection pooling, retry policy, Sentinel setup, or observability exporters. Those remain application-owned. A Redis client with `set`, `get`, `del`, `scanIterator`, and `eval` is required for the complete cache and lock factory; storage-only use can omit scanning, while the lock requires token-checked `eval` release.

See the [Redis Node.js guide](https://redis.io/tutorials/develop/node/gettingstarted/) and [OneKit ISR documentation](../../docs/V3_ISR_CACHE.md).
