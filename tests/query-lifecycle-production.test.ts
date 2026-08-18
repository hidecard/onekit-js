import { createQueryClient } from '../src';

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
