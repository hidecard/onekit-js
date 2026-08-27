# @onekit-js/vercel-global-config

Read-only Vercel Global Config integration for OneKit JS. **Vercel Edge Config was renamed to Global Config**, and new projects should use the `@vercel/global-config` SDK while legacy connection strings and SDKs remain supported by Vercel.

## Install

```bash
npm install onekit-js @onekit-js/vercel-global-config @vercel/global-config
```

The Vercel SDK is an optional peer dependency. The adapter receives `createClient` explicitly, so the package does not import Node APIs, read process globals, or force a platform-specific environment-variable convention.

## Usage

```ts
import { createClient } from '@vercel/global-config';
import { createVercelGlobalConfigReader } from '@onekit-js/vercel-global-config';

const config = createVercelGlobalConfigReader({
  createClient,
  connectionString: process.env.GLOBAL_CONFIG,
});

const feature = await config.get<{ enabled: boolean }>('feature');
const allValues = await config.getAll();
```

For an edge runtime, pass the connection string from the deployment platform's environment binding. Do not place read tokens in client-side bundles.

## Scope boundary

Global Config is optimized for high-volume configuration reads. The official SDK is read-only; writes use Vercel's management API. This package therefore intentionally exposes a configuration reader and does **not** pretend that Global Config is a durable ISR page cache or a distributed regeneration lock. Pair OneKit ISR with a storage/lock provider such as `@onekit-js/redis` or `@onekit-js/deno-kv` when page persistence and regeneration exclusion are required.

See Vercel's [Global Config SDK guide](https://vercel.com/docs/global-config/global-config-sdk), [migration guide](https://vercel.com/docs/global-config/migration-guide), and [OneKit ISR documentation](../../docs/V3_ISR_CACHE.md).
