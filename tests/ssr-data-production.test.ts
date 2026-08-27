import { webcrypto } from 'node:crypto';
import {
  createHmacSha256Signer,
  createRouteDataPayload,
  createQueryBroadcastSync,
  createQueryClient,
  parseRouteDataPayload,
  type QueryBroadcastChannel,
  type RouteDataSnapshot,
} from '../src';

const snapshot: RouteDataSnapshot = {
  version: 1,
  fullPath: '/users/42?tab=profile',
  routes: [{ path: '/users/:id', data: { name: 'Ada', secret: 'do-not-send' } }],
};

class TestChannel implements QueryBroadcastChannel {
  private listeners = new Set<(event: MessageEvent<unknown>) => void>();
  messages: unknown[] = [];

  postMessage(message: unknown): void {
    this.messages.push(message);
    for (const listener of this.listeners) listener({ data: message } as MessageEvent<unknown>);
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void { this.listeners.add(listener); }
  removeEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void { this.listeners.delete(listener); }
}

describe('secure SSR route-data transport', () => {
  beforeAll(() => {
    if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  });
  test('redacts sensitive fields and round-trips query state', async () => {
    const serialized = await createRouteDataPayload(snapshot, {
      redact: (path, value) => path.endsWith('.secret') ? undefined : value,
      now: () => 1000,
      ttl: 1000,
    }, {
      queries: [{ key: '["user",42]', tags: ['user:42'], state: { status: 'success', data: { name: 'Ada' }, updatedAt: 1000 } }],
    });
    const payload = await parseRouteDataPayload(serialized, { now: () => 1500, expectedFullPath: snapshot.fullPath });
    expect(payload?.snapshot.routes[0].data).toEqual({ name: 'Ada' });
    expect(payload?.query?.queries[0].tags).toEqual(['user:42']);
  });

  test('rejects malformed, expired, oversized, and mismatched payloads', async () => {
    expect(await parseRouteDataPayload('{bad json')).toBeNull();
    const serialized = await createRouteDataPayload(snapshot, { now: () => 1000, ttl: 10 });
    expect(await parseRouteDataPayload(serialized, { now: () => 1011 })).toBeNull();
    expect(await parseRouteDataPayload(serialized, { expectedFullPath: '/other' })).toBeNull();
    expect(await parseRouteDataPayload(serialized, { maxBytes: 8 })).toBeNull();
    const deep = JSON.stringify({ version: 1, kind: 'onekit-route-data', issuedAt: 1, snapshot: { version: 1, fullPath: '/', routes: [{ path: '/', data: { value: 'x'.repeat(20) } }] } });
    expect(await parseRouteDataPayload(deep, { maxStringLength: 10 })).toBeNull();
  });

  test('rejects functions, class instances, cycles, and non-finite values', async () => {
    expect(createRouteDataPayload({ ...snapshot, routes: [{ path: '/x', data: () => 'no' }] })).rejects.toMatchObject({ code: 'unsupported-value' });
    expect(createRouteDataPayload({ ...snapshot, routes: [{ path: '/x', data: new Date() }] })).rejects.toMatchObject({ code: 'unsupported-value' });
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(createRouteDataPayload({ ...snapshot, routes: [{ path: '/x', data: cycle }] })).rejects.toMatchObject({ code: 'unsupported-value' });
    expect(createRouteDataPayload({ ...snapshot, routes: [{ path: '/x', data: Infinity }] })).rejects.toMatchObject({ code: 'unsupported-value' });
  });

  test('supports optional Web Crypto signatures and fails closed', async () => {
    const signer = await createHmacSha256Signer('test-secret');
    const serialized = await createRouteDataPayload(snapshot, { signer });
    expect(await parseRouteDataPayload(serialized, { signer, requireSignature: true })).not.toBeNull();
    expect(await parseRouteDataPayload(serialized, { requireSignature: true })).toBeNull();
    const tampered = serialized.replace('Ada', 'Eve');
    expect(await parseRouteDataPayload(tampered, { signer })).toBeNull();
  });
});

describe('unified query cache tags', () => {
  test('invalidates and revalidates all records sharing a tag', async () => {
    const client = createQueryClient();
    let calls = 0;
    await client.fetch(['user', 1], () => ({ value: ++calls }), { tags: ['user:1'], revalidate: 60_000 });
    await client.fetch(['profile', 1], () => ({ value: ++calls }), { tags: ['user:1'], revalidate: 60_000 });
    client.invalidateTag('user:1');
    expect(client.getState(['user', 1]).updatedAt).toBe(0);
    await client.revalidateTag('user:1');
    expect(calls).toBe(4);
    expect(client.dehydrate().queries.every(query => query.tags?.includes('user:1'))).toBe(true);
    client.dispose();
  });

  test('broadcasts tags but not data or errors', () => {
    const channel = new TestChannel();
    const sender = createQueryClient();
    const receiver = createQueryClient();
    const senderSync = createQueryBroadcastSync(sender, { channel });
    const receiverSync = createQueryBroadcastSync(receiver, { channel });
    receiver.setData(['user', 1], { privateValue: 'local-only' });
    receiverSync.publishInvalidateTag('user:1');
    expect(channel.messages.at(-1)).toEqual(expect.objectContaining({ type: 'invalidate-tag', tag: 'user:1' }));
    expect(JSON.stringify(channel.messages.at(-1))).not.toContain('privateValue');
    senderSync.dispose();
    receiverSync.dispose();
    sender.dispose();
    receiver.dispose();
  });
});
