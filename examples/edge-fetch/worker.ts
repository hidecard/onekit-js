import { createEdgeHandler } from 'onekit-js/edge';
import { createServerApp } from 'onekit-js';

const app = createServerApp();
app.get('/health', context => context.json({ ok: true }));

const edge = createEdgeHandler(app, { requireStreaming: true });

export default {
  async fetch(request: Request, env: unknown, executionContext: { waitUntil?(promise: Promise<unknown>): void }) {
    return edge.fetch(request, { env, executionContext });
  },
};
