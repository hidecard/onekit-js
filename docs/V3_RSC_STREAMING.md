# OneKit JS V3 — Streaming SSR and Experimental RSC-Style Protocol

## Streaming SSR integration

`StreamingRenderer.renderToStream()` now accepts optional inert payload strings alongside the existing progressive boundary scheduler. A secure route-data envelope can be emitted as `application/json`, and an experimental OneKit Flight-like payload can be emitted as `application/x-onekit-flight`. Both are placed in non-executable `<script>` elements and escaped against HTML/script termination. Use `readStreamingPayloads()` on the client to retrieve the text and then pass route data through `parseRouteDataPayload()` before applying it to Router/QueryClient.

```ts
const routePayload = await createRouteDataPayload({
  routerSnapshot,
  querySnapshot,
  fullPath: request.url,
  issuedAt: Date.now(),
  expiresAt: Date.now() + 30_000,
});

const flight = encodeRSCFlight([
  createRSCFlightRecord('root', {
    title: 'Dashboard',
    component: createRSCClientReference('ui/Dashboard', 'default'),
  }),
]);

const stream = await new StreamingRenderer().renderToStream(shell, {
  routeDataPayload: routePayload,
  rscPayload: flight,
  signal: request.signal,
});
```

Payload scripts are transport data only. The streaming renderer does not execute client references, import modules, or hydrate components automatically. Applications must parse, authenticate, authorize, and resolve them through an application-owned registry.

## Experimental RSC-style records

The `onekit-js/rsc` surface provides a deliberately small, bounded record protocol. `createRSCClientReference(moduleId, exportName)` describes a client-owned module without importing it on the server. `encodeRSCFlight()` produces versioned newline-delimited records; `decodeRSCFlight()` validates the version, record shape, serializable values, nesting depth, record count, payload size, cycles, non-finite numbers, and prototype-pollution-shaped keys. `resolveRSCFlight()` invokes only the resolver supplied by the application and returns resolved data; it never renders or executes a component implicitly.

| Capability | OneKit V3 experimental scope | Not included |
|---|---|---|
| Server/client boundary | Existing Vite directives, explicit markers, and transitive static-import diagnostics | Automatic RSC module graph transforms or bundle splitting |
| Transport | Versioned bounded records and inert streaming script payloads | React Flight wire compatibility or navigation protocol compatibility |
| Client references | Explicit `{ moduleId, exportName }` values and application resolver | Automatic module loading, trust decisions, or component execution |
| Serialization | JSON-like values, references, depth/size/record limits, fail-closed parsing | Functions, symbols, class instances, arbitrary custom serializers, or secret filtering beyond the application model |
| Rendering | Existing OneKit SSR/streaming renderer | Full React Server Components renderer and Server Functions/Actions |

## Security and deployment ownership

Do not treat a client reference or decoded model as trusted authorization input. Validate module IDs against an allowlist, keep server secrets out of models and HTML, apply route-data signature and expiry checks, and isolate tenant/request data. The protocol has no built-in module loader, signing key management, replay protection, distributed stream coordination, or deployment adapter. Those responsibilities remain with the application and its deployment platform.

This is an **RSC-style compatibility layer**, not React RSC or Next.js Flight parity. A complete integration would require a React-compatible renderer, compiler transforms, client-reference manifests, server-function protocol, suspense/navigation semantics, streaming back-pressure policy, and framework-owned deployment integration.
