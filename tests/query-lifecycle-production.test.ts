import indexedDB from 'fake-indexeddb';
import { createIndexedDBQueryStorage, createQueryBroadcastSync, createQueryClient, type QueryBroadcastChannel } from '../src';

describe('query lifecycle', () => {
  it('invalidates and notifies subscribers', () => {
    const client = createQueryClient();
    client.setData(['user', 1], { name: 'A' });
    const states: string[] = [];
    client.subscribe(['user', 1], state => states.push(state.status));
    client.invalidateQueries(['user', 1]);
    expect(client.getState(['user', 1]).updatedAt).toBe(0);
    expect(states).toEqual(['success']);
  });

  it('retries failed loaders according to retry options', async () => {
    const client = createQueryClient();
    let attempts = 0;
    const data = await client.fetch('retry', () => {
      attempts += 1;
      if (attempts < 3) throw new Error('temporary');
      return 'ok';
    }, { retry: 2 });
    expect(data).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('cancels an in-flight query', async () => {
    const client = createQueryClient();
    let signal: AbortSignal | undefined;
    const pending = client.fetch('slow', ({ signal: nextSignal } = { signal: new AbortController().signal }) => {
      signal = nextSignal;
      return new Promise<string>((_, reject) => {
        nextSignal.addEventListener('abort', () => reject(nextSignal.reason), { once: true });
      });
    });
    client.cancel('slow');
    await expect(pending).rejects.toBeDefined();
    expect(signal?.aborted).toBe(true);
  });

  it('persists settled cache and restores it in a new client', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const first = createQueryClient({ persistence: { storage, key: 'test-cache' } });
    first.setData('profile', { name: 'OneKit' });
    await new Promise(resolve => setTimeout(resolve, 5));
    const second = createQueryClient({ persistence: { storage, key: 'test-cache' } });
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(second.getData<{ name: string }>('profile')).toEqual({ name: 'OneKit' });
    first.dispose();
    second.dispose();
  });

  it('persists and restores query state through the IndexedDB adapter', async () => {
    const originalIndexedDB = globalThis.indexedDB;
    const originalStructuredClone = globalThis.structuredClone;
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: indexedDB });
    if (!globalThis.structuredClone) {
      Object.defineProperty(globalThis, 'structuredClone', {
        configurable: true,
        value: <T>(value: T) => JSON.parse(JSON.stringify(value)) as T,
      });
    }
    const databaseName = `onekit-query-test-${Date.now()}-${Math.random()}`;
    const storage = createIndexedDBQueryStorage({ databaseName });
    try {
      await storage.setItem('cache', JSON.stringify({ queries: [{ key: 'profile', state: { status: 'success', data: { name: 'OneKit' }, updatedAt: Date.now() } }] }));
      expect(JSON.parse((await storage.getItem('cache')) ?? '{}').queries[0].state.data).toEqual({ name: 'OneKit' });

      const client = createQueryClient({ persistence: { storage, key: 'cache' } });
      for (let attempt = 0; attempt < 20 && client.getData<{ name: string }>('profile') === undefined; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      expect(client.getData<{ name: string }>('profile')).toEqual({ name: 'OneKit' });
      client.dispose();
      await storage.removeItem?.('cache');
      expect(await storage.getItem('cache')).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: originalIndexedDB });
      Object.defineProperty(globalThis, 'structuredClone', { configurable: true, value: originalStructuredClone });
    }
  });

  it('synchronizes invalidation through an application-controlled channel without sharing data', () => {
    const listeners = new Set<(event: MessageEvent<unknown>) => void>();
    const messages: unknown[] = [];
    const channel: QueryBroadcastChannel = {
      postMessage: (message) => {
        messages.push(message);
        for (const listener of listeners) listener({ data: message } as MessageEvent<unknown>);
      },
      addEventListener: (_type, listener) => { listeners.add(listener); },
      removeEventListener: (_type, listener) => { listeners.delete(listener); },
    };
    const sender = createQueryClient();
    const receiver = createQueryClient();
    const senderSync = createQueryBroadcastSync(sender, { channel });
    const receiverSync = createQueryBroadcastSync(receiver, { channel });
    sender.setData(['todos', 1], ['draft']);
    receiver.setData(['todos', 1], ['cached']);

    senderSync.publishInvalidate(['todos', 1]);
    expect(receiver.getState(['todos', 1]).updatedAt).toBe(0);
    expect(messages[0]).toMatchObject({ type: 'invalidate', key: '["todos",1]' });
    expect(messages[0]).not.toHaveProperty('data');

    receiver.setData(['todos', 1], ['fresh']);
    receiverSync.dispose();
    senderSync.publishInvalidate(['todos', 1]);
    expect(receiver.getState(['todos', 1]).updatedAt).toBeGreaterThan(0);

    senderSync.dispose();
    sender.dispose();
    receiver.dispose();
  });

  it('flushes pending persistence when disposed', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => { values.set(key, value); },
    };
    const client = createQueryClient({ persistence: { storage, key: 'dispose-cache' } });
    client.setData('profile', { name: 'OneKit' });
    client.dispose();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(JSON.parse(values.get('dispose-cache') ?? '{}').queries[0].key).toBe('profile');
  });

  it('revalidates remembered loaders on window focus and reconnect', async () => {
    const client = createQueryClient();
    let calls = 0;
    await client.fetch('status', () => ++calls);
    window.dispatchEvent(new Event('focus'));
    await new Promise(resolve => setTimeout(resolve, 5));
    window.dispatchEvent(new Event('online'));
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(calls).toBe(3);
    client.dispose();
  });

  it('applies and rolls back optimistic mutation data', async () => {
    const client = createQueryClient();
    client.setData('todos', [{ id: 1, done: false }]);
    await expect(client.mutate(
      { id: 1 },
      {
        mutationFn: async () => { throw new Error('failed'); },
        optimistic: {
          key: 'todos',
          update: (current) => (current as Array<{ id: number; done: boolean }>).map(item => ({ ...item, done: true })),
        },
      },
    )).rejects.toThrow('failed');
    expect(client.getData('todos')).toEqual([{ id: 1, done: false }]);
  });
});
