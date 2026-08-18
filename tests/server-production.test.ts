/** @jest-environment node */

import {
  createServerApp,
  createNodeHandler,
  defineMiddleware,
  jsonResponse,
  createApi,
  createServerError,
  securityMiddleware,
  type DatabaseAdapter,
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

  it('serializes typed application errors without leaking unexpected failures', async () => {
    const app = createApi();
    app.get('/bad-request', () => {
      throw createServerError('Name is required', {
        status: 422,
        code: 'VALIDATION_FAILED',
        details: { field: 'name' },
        headers: { 'x-error-source': 'validation' },
      });
    });
    app.get('/unexpected', () => { throw new Error('database password=secret'); });

    const badRequest = await app.handle(new Request('http://localhost/bad-request'));
    expect(badRequest.status).toBe(422);
    expect(badRequest.headers.get('x-error-source')).toBe('validation');
    expect(await badRequest.json()).toEqual({
      error: 'Name is required',
      code: 'VALIDATION_FAILED',
      details: { field: 'name' },
    });

    const unexpected = await app.handle(new Request('http://localhost/unexpected'));
    expect(unexpected.status).toBe(500);
    expect(await unexpected.json()).toEqual({ error: 'Internal Server Error' });
  });

  it('supports a resilient custom error response hook', async () => {
    const app = createApi({
      onError: () => { throw new Error('telemetry failed'); },
      errorResponse: (error) => new Response(JSON.stringify({ handled: error instanceof Error }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    });
    app.get('/failure', () => { throw new Error('temporary outage'); });
    const response = await app.handle(new Request('http://localhost/failure'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ handled: true });
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

  it('supports authentication, authorization, and rate limiting guards', async () => {
    const app = createApi();
    app.get(
      '/secure',
      securityMiddleware.authenticate(() => ({ id: 'u1', role: 'admin' })),
      securityMiddleware.authorize((user) => user.role === 'admin'),
      ({ state, ok }) => ok({ user: state.user }),
    );
    app.get('/limited', securityMiddleware.rateLimit({ max: 2, windowMs: 60_000 }), ({ ok }) => ok({ ok: true }));

    const secure = await app.handle(new Request('http://localhost/secure'));
    expect(secure.status).toBe(200);
    expect(await secure.json()).toEqual({ user: { id: 'u1', role: 'admin' } });

    const denied = createApi();
    denied.get('/secure', securityMiddleware.authenticate(() => ({ id: 'u2', role: 'viewer' })), securityMiddleware.authorize(() => false), ({ ok }) => ok({ ok: true }));
    expect((await denied.handle(new Request('http://localhost/secure'))).status).toBe(403);

    const limited = createApi();
    limited.get('/limited', securityMiddleware.rateLimit({ max: 1, windowMs: 60_000 }), ({ ok }) => ok({ ok: true }));
    const first = await limited.handle(new Request('http://localhost/limited'));
    const second = await limited.handle(new Request('http://localhost/limited'));
    expect(first.headers.get('x-ratelimit-remaining')).toBe('0');
    expect(second.status).toBe(429);
    expect(second.headers.get('retry-after')).toBeTruthy();
  });

  it('supports one-read typed body helpers and concise resource routes', async () => {
    const app = createApi();
    app.resource('/todos', {
      list: ({ ok }) => ok({ action: 'list' }),
      get: ({ params, ok }) => ok({ action: 'get', id: params.id }),
      create: async ({ body, ok }) => ok({ action: 'create', input: await body<{ title: string }>() }),
      update: ({ params, ok }) => ok({ action: 'update', id: params.id }),
      remove: ({ params, ok }) => ok({ action: 'remove', id: params.id }),
    });

    const list = await app.handle(new Request('http://localhost/todos'));
    const item = await app.handle(new Request('http://localhost/todos/t1'));
    const created = await app.handle(new Request('http://localhost/todos', {
      method: 'POST',
      body: JSON.stringify({ title: 'Learn OneKit' }),
      headers: { 'content-type': 'application/json' },
    }));
    const removed = await app.handle(new Request('http://localhost/todos/t1', { method: 'DELETE' }));

    expect(await list.json()).toEqual({ action: 'list' });
    expect(await item.json()).toEqual({ action: 'get', id: 't1' });
    expect(await created.json()).toEqual({ action: 'create', input: { title: 'Learn OneKit' } });
    expect(await removed.json()).toEqual({ action: 'remove', id: 't1' });
  });

  it('accepts a portable rate-limit store contract', async () => {
    const counters = new Map<string, number>();
    const store = {
      increment(key: string) {
        const count = (counters.get(key) ?? 0) + 1;
        counters.set(key, count);
        return { count, resetAt: Date.now() + 60_000 };
      },
    };
    const app = createApi();
    app.use(serverMiddleware.rateLimit({ max: 1, windowMs: 60_000, key: () => 'user-1', store }));
    app.get('/limited', ({ ok }) => ok({ done: true }));
    expect((await app.handle(new Request('http://localhost/limited'))).status).toBe(200);
    expect((await app.handle(new Request('http://localhost/limited'))).status).toBe(429);
    expect(counters.get('user-1')).toBe(2);
  });

  it('supports idempotent lifecycle hooks and closes the database on stop', async () => {
    const events: string[] = [];
    const database: DatabaseAdapter = {
      async query() { return []; },
      async execute() { return { affectedRows: 0 }; },
      async transaction<T>(work) { return work(this); },
      async close() { events.push('database:close'); },
    };
    const app = createApi({
      database,
      onStart: () => { events.push('start'); },
      onStop: () => { events.push('stop'); },
    });
    await app.start();
    await app.start();
    await Promise.all([app.stop(), app.stop()]);
    expect(events).toEqual(['start', 'stop', 'database:close']);
  });

  it('runs global middleware for missing routes and handles CORS preflight', async () => {
    const app = createApi();
    app.use(serverMiddleware.cors({ origin: 'https://example.test', credentials: true, maxAge: 600 }));
    const preflight = await app.handle(new Request('http://localhost/missing', {
      method: 'OPTIONS',
      headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'x-demo' },
    }));
    const missing = await app.handle(new Request('http://localhost/missing'));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('https://example.test');
    expect(preflight.headers.get('access-control-allow-headers')).toBe('x-demo');
    expect(preflight.headers.get('access-control-allow-credentials')).toBe('true');
    expect(preflight.headers.get('access-control-max-age')).toBe('600');
    expect(missing.status).toBe(404);
    expect(missing.headers.get('access-control-allow-origin')).toBe('https://example.test');
  });

  it('adds CORS and request ids through built-in middleware', async () => {
    const app = createServerApp();
    app.use(serverMiddleware.requestId(), serverMiddleware.cors({ origin: 'https://example.test' }));
    app.get('/meta', async (context) => jsonResponse({ id: context.state.requestId }));
    const response = await app.handle(new Request('http://localhost/meta'));
    expect(response.headers.get('access-control-allow-origin')).toBe('https://example.test');
    expect((await response.json()).id).toEqual(expect.any(String));
  });

  it('exposes the typed database adapter through request context', async () => {
    const calls: string[] = [];
    const database: DatabaseAdapter = {
      async query<T>(statement: string) { calls.push(`query:${statement}`); return [{ id: 'p1' } as T]; },
      async execute(statement: string) { calls.push(`execute:${statement}`); return { affectedRows: 1 }; },
      async transaction<T>(work) { return work(this); }
    };
    const app = createApi({ database });
    app.get('/projects', async ({ database: db, ok }) => ok({ rows: await db?.query<{ id: string }>('select projects') }));
    const response = await app.handle(new Request('http://localhost/projects'));
    expect(await response.json()).toEqual({ rows: [{ id: 'p1' }] });
    expect(calls).toEqual(['query:select projects']);
  });

  it('supports session and token provider middleware contracts', async () => {
    const sessionApp = createApi();
    sessionApp.get('/me', securityMiddleware.session({ getUser: () => ({ id: 'session-user' }) }), ({ state, ok }) => ok({ user: state.user }));
    const sessionResponse = await sessionApp.handle(new Request('http://localhost/me'));
    expect(await sessionResponse.json()).toEqual({ user: { id: 'session-user' } });

    const tokenApp = createApi();
    tokenApp.get('/me', securityMiddleware.token({ verify: (request) => request.headers.get('authorization') === 'Bearer valid' ? { id: 'token-user' } : null }), ({ state, ok }) => ok({ user: state.user }));
    const rejected = await tokenApp.handle(new Request('http://localhost/me'));
    const accepted = await tokenApp.handle(new Request('http://localhost/me', { headers: { authorization: 'Bearer valid' } }));
    expect(rejected.status).toBe(401);
    expect(await accepted.json()).toEqual({ user: { id: 'token-user' } });
  });
});
