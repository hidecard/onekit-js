/** @jest-environment node */

import {
  createServerApp,
  createNodeHandler,
  defineMiddleware,
  jsonResponse,
  createApi,
  serverMiddleware,
  validateBody
} from '../src';

describe('full-stack server production contract', () => {
  it('matches routes, decodes params, and exposes query values', async () => {
    const app = createServerApp();
    app.get('/users/:id', async (context) => jsonResponse({
      id: context.params.id,
      tab: context.query.get('tab')
    }));

    const response = await app.handle(new Request('http://localhost/users/a%2Fb?tab=profile'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 'a/b', tab: 'profile' });
  });

  it('runs middleware in order and supports request state', async () => {
    const app = createServerApp();
    const order: string[] = [];
    app.use(defineMiddleware(async (context, next) => {
      order.push('before');
      context.state.role = 'admin';
      const response = await next();
      order.push('after');
      return response;
    }));
    app.get('/health', async (context) => {
      order.push(String(context.state.role));
      return jsonResponse({ ok: true });
    });

    const response = await app.handle(new Request('http://localhost/health'));
    expect(response.status).toBe(200);
    expect(order).toEqual(['before', 'admin', 'after']);
  });

  it('validates JSON bodies and exposes the parsed value', async () => {
    const app = createServerApp();
    app.post('/projects', validateBody((value) => {
      if (!value || typeof value !== 'object' || typeof (value as { name?: unknown }).name !== 'string') {
        throw new Error('name is required');
      }
      return value;
    }), async (context) => jsonResponse({ name: (context.state.body as { name: string }).name }, { status: 201 }));

    const valid = await app.handle(new Request('http://localhost/projects', {
      method: 'POST', body: JSON.stringify({ name: 'OneKit' }), headers: { 'content-type': 'application/json' }
    }));
    const invalid = await app.handle(new Request('http://localhost/projects', {
      method: 'POST', body: JSON.stringify({}), headers: { 'content-type': 'application/json' }
    }));

    expect(valid.status).toBe(201);
    expect(invalid.status).toBe(400);
  });

  it('provides DI services and returns safe 404/500 responses', async () => {
    const app = createServerApp();
    app.routes;
    app.get('/service', async (context) => {
      context.services.register('answer', () => 42);
      return jsonResponse({ value: context.services.resolve<number>('answer') });
    });
    const found = await app.handle(new Request('http://localhost/service'));
    const missing = await app.handle(new Request('http://localhost/missing'));
    expect(await found.json()).toEqual({ value: 42 });
    expect(missing.status).toBe(404);

    app.get('/failure', async () => { throw new Error('secret'); });
    const failure = await app.handle(new Request('http://localhost/failure'));
    expect(failure.status).toBe(500);
    expect(await failure.json()).toEqual({ error: 'Internal Server Error' });
  });

  it('supports the concise createApi and context response helpers', async () => {
    const app = createApi();
    app.get('/hello/:name', ({ params, ok }) => ok({ hello: params.name }));
    app.get('/fail', ({ fail }) => fail('Not allowed', 403));

    const greeting = await app.handle(new Request('http://localhost/hello/OneKit'));
    const failure = await app.handle(new Request('http://localhost/fail'));

    expect(await greeting.json()).toEqual({ hello: 'OneKit' });
    expect(failure.status).toBe(403);
    expect(await failure.json()).toEqual({ error: 'Not allowed' });
  });

  it('bridges Node HTTP request/response objects through createNodeHandler', async () => {
    const app = createApi();
    app.post('/node', async ({ request, ok }) => ok({ value: await request.json() }));
    const handler = createNodeHandler(app, 'http://example.test');
    const output: { status?: number; headers?: Record<string, string>; body?: Uint8Array } = {};
    const request = {
      method: 'POST',
      url: '/node',
      headers: { 'content-type': 'application/json' },
      async *[Symbol.asyncIterator]() { yield '{"value":42}'; }
    };
    await handler(request, {
      writeHead(status, headers) { output.status = status; output.headers = headers; return this; },
      end(body) { output.body = body; }
    });
    expect(output.status).toBe(200);
    expect(output.headers?.['content-type']).toContain('application/json');
    expect(JSON.parse(new TextDecoder().decode(output.body))).toEqual({ value: { value: 42 } });
  });

  it('adds CORS and request ids through built-in middleware', async () => {
    const app = createServerApp();
    app.use(serverMiddleware.requestId(), serverMiddleware.cors({ origin: 'https://example.test' }));
    app.get('/meta', async (context) => jsonResponse({ id: context.state.requestId }));
    const response = await app.handle(new Request('http://localhost/meta'));
    expect(response.headers.get('access-control-allow-origin')).toBe('https://example.test');
    expect((await response.json()).id).toEqual(expect.any(String));
  });
});
