# Vite File Routes and Server/Client Boundary

OneKit JS provides two **opt-in build-time primitives** for applications that want a more framework-like project convention without changing the default runtime APIs:

1. `fileRoutes` discovers route files and emits a virtual module containing ordinary `Route[]` data plus deterministic route/layout/middleware metadata.
2. `componentBoundary` checks `"use client"` and `"use server"` directives and rejects a static client-to-server import during the build.

These features are safety and composition primitives. They are **not** a React Server Components runtime, a Flight transport, or a complete Next.js replacement.

## Configuration

```ts
import { defineConfig } from 'vite';
import { oneKitVitePlugin } from 'onekit-js/vite';

export default defineConfig({
  plugins: [oneKitVitePlugin({
    fileRoutes: {
      root: '/src/app',
      includeInfrastructure: true,
    },
    componentBoundary: {
      strict: true,
    },
  })],
});
```

The route root is interpreted relative to the Vite project root. The generated virtual module is `virtual:onekit/routes` by default. A custom `virtualModuleId` can be supplied when an application has another virtual-module convention.

## Generated route module

```ts
import routes, {
  fileRouteLayouts,
  fileRouteManifest,
  fileRouteMiddleware,
} from 'virtual:onekit/routes';
import { createRouter } from 'onekit-js/router';

const router = createRouter(routes, { mode: 'history' });
```

The generated module imports discovered route modules and maps their default export to `component`. A module may also export a `route` object to override or extend the generated path:

```ts
// src/app/reports/[id]/page.tsx
export const route = {
  loader: ({ to, signal }) => fetch(`/api/reports/${to.params.id}`, { signal }).then(response => response.json()),
};

export default function ReportPage() {
  return null;
}
```

The manifest exposes `routes`, `layouts`, and `middleware` entries. Layout and middleware entries are metadata for **explicit application composition**; the plugin does not silently inject middleware into the Router or invent a component tree. This keeps authorization, request lifecycle, and layout ownership visible in application code.

## File conventions

| File or directory | Generated result |
| --- | --- |
| `page.tsx` or `index.tsx` | Parent directory route |
| `[id].tsx` | `:id` dynamic parameter |
| `[...slug].tsx` | `*` required catch-all |
| `[[...slug]].tsx` | `*?` optional catch-all |
| `(marketing)/page.tsx` | Group directory omitted from the URL |
| `layout.tsx` or `_layout.tsx` | Layout metadata entry for the containing directory when infrastructure is enabled |
| `middleware.ts` or `_middleware.ts` | Middleware metadata entry for the containing directory when infrastructure is enabled |

The plugin performs discovery during Vite’s `load` hook and does not access the filesystem in the browser bundle. The generated manifest is deterministic for a fixed set of project files.

## Server/Client directives

A module can opt into a boundary using a leading directive:

```ts
// src/components/SearchBox.tsx
'use client';

export function SearchBox() {
  return null;
}
```

```ts
// src/data/reports.ts
'use server';

export async function loadReports() {
  return [];
}
```

With `componentBoundary: true` or `{ strict: true }`, the plugin records the directives and examines the Vite module graph at build end. A client module may not statically import a server module. A server module may import a client boundary because the server can own the composition edge. Modules without a directive are treated as shared.

The validator includes both static and dynamic Vite graph imports in its conservative check. It does not transform modules, remove server code from browser output, serialize props, create a server-only execution process, or provide authorization. Applications must still configure separate server/client builds or deployment boundaries when secrets and server-only dependencies are involved.

## Contract and limitations

The file-route virtual module and boundary validator are **Experimental** APIs. They are intended to make project conventions and accidental import mistakes visible earlier, while the existing `createFileRoutes()`, `createFileRouteManifest()`, `Router`, and SSR contracts remain available independently.

The following work is intentionally still separate: runtime layout/middleware composition, generated fully typed route modules, prerendering, streamed route payload transport, Server Functions/Actions, Flight-like serialization, automatic client code splitting, and production deployment adapters. Those features require an architectural contract beyond a Vite plugin hook.
