# @onekit-js/deno-kv

Deno KV adapters for OneKit JS ISR. This package adapts a `Deno.Kv`-compatible client to OneKit's serialized ISR cache and provides an atomic cross-instance regeneration lease with KV expiration.

## Install

```bash
deno add npm:@onekit-js/deno-kv
```

For npm-compatible Deno projects:

```bash
npm install onekit-js @onekit-js/deno-kv
```

## Usage in Deno

```ts
import { createDenoKVISRAdapters } from '@onekit-js/deno-kv';
import { ISRRenderer } from 'onekit-js/isr';

const kv = await Deno.openKv();
const { cache, lock } = createDenoKVISRAdapters(kv, {
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

The lock is acquired with `atomic().check(...).set(..., { expireIn })`. Release reads the current versionstamp and performs a checked atomic delete only when the stored token still belongs to the lease owner. This prevents an old owner from deleting a replacement lease.

## Consistency and deployment

Reads default to strong consistency because ISR cache lookup and lock coordination should not silently observe an older value. `consistency: 'eventual'` is available for applications that explicitly accept stale reads. Deno KV expiration and atomic commit behavior are provided by Deno KV; the adapter does not emulate them in JavaScript.

The package does not open or close a database for the application, and it does not claim to support non-Deno KV stores. Use `Deno.openKv(':memory:')` for isolated local tests where supported by the installed Deno version.

See the [Deno KV documentation](https://docs.deno.com/deploy/kv/) and [OneKit ISR documentation](../../docs/V3_ISR_CACHE.md).
