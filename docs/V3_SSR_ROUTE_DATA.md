# V3 SSR Route-Data Transport and Cache Revalidation

OneKit’s existing `Router.dehydrate()`/`Router.hydrate()` methods are trusted in-process snapshot primitives. The transport helpers in this document add an explicit, application-owned boundary for moving route-loader and query data from a server render to a browser. They do not create a server, choose an authentication policy, or implement React Flight/RSC.

## Secure route-data envelope

`createRouteDataPayload()` emits a versioned JSON envelope. It accepts a route snapshot and, optionally, a `QueryClient.dehydrate()` result. The serializer only permits JSON-safe values, rejects cycles, class instances, functions, symbols, non-finite numbers, excessive nesting, long strings, and oversized payloads. A `redact(path, value)` or `exclude(path, value)` hook should be used to keep credentials, internal authorization decisions, and other sensitive values out of the browser payload.

```ts
import {
  createRouteDataPayload,
  createHmacSha256Signer,
} from 'onekit-js';

const signer = await createHmacSha256Signer(process.env.ROUTE_DATA_SECRET!);
const serialized = await createRouteDataPayload(router.dehydrate()!, {
  signer,
  ttl: 30_000,
  redact: (path, value) => path.endsWith('.token') ? undefined : value,
}, queryClient.dehydrate());
```

The optional signer is deliberately adapter-based. The built-in `createHmacSha256Signer()` uses Web Crypto HMAC-SHA-256, but applications remain responsible for secret storage, key rotation, replay policy, and transport headers or cookies. Do not place a signing secret in client code.

| Validation control | Default | Failure behavior |
| --- | ---: | --- |
| Envelope version/kind | Version 1 | Parser returns `null` |
| Maximum UTF-8 payload | 512 KiB | Serializer throws; parser returns `null` |
| Maximum string length | 100,000 code units | Serializer throws; parser returns `null` |
| Maximum nested depth | 20 | Serializer throws; parser returns `null` |
| Expiry | None unless `ttl` or `maxAge` is configured | Parser returns `null` |
| URL binding | None unless `expectedFullPath` is configured | Parser returns `null` |
| Signature | Optional unless `requireSignature` is true | Parser returns `null` when required or invalid |

The browser must validate before hydration. A rejected payload must not be passed to `Router.hydrate()` or `QueryClient.hydrate()`.

```ts
import { applyRouteDataPayload, parseRouteDataPayload } from 'onekit-js';

const payload = await parseRouteDataPayload(document
  .querySelector('script[data-onekit-route-data]')?.textContent ?? '', {
    expectedFullPath: window.location.pathname + window.location.search,
    maxAge: 30_000,
    signer,
    requireSignature: true,
  });

if (payload) applyRouteDataPayload(payload, router, queryClient);
```

The transport is intentionally application-owned: a framework adapter decides how the string is embedded or fetched, while OneKit validates the contents and applies the already-validated snapshot through existing APIs. This keeps SSR, streaming, and deployment concerns decoupled.

## Shared cache and revalidation

`QueryOptions` now accepts stable application-owned `tags` and a `revalidate` alias for `staleTime`. Router route loaders already accept `queryOptions`, so the same tags and freshness policy can be used for route data and direct query data.

```ts
const routes = [{
  path: '/users/:id',
  queryKey: ({ to }) => ['user', to.params.id],
  queryOptions: { tags: ['user:detail'], revalidate: 60_000 },
  loader: ({ to, signal }) => loadUser(to.params.id, signal),
}];

queryClient.invalidateTag('user:detail');
await queryClient.revalidateTag('user:detail');
```

Tag invalidation changes freshness without broadcasting cached values. `createQueryBroadcastSync()` can broadcast a normalized key or a tag, but never sends data, errors, or secrets across tabs. Dehydrated query states retain their tags so a server handoff does not lose invalidation identity.

## Compatibility and limitations

Existing key-based invalidation, `staleTime`, query persistence, router snapshots, and router loader cancellation remain supported. The new transport does not silently change route loading or automatically attach layouts and middleware. It also does not provide RSC/Flight serialization, automatic client bundle splitting, Server Functions, authorization, replay protection, or a provider-neutral deployment secret store. Those concerns require separate architecture and security decisions.
