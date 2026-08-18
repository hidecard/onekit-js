import {
  createMemoryServerDataCache,
  createServerData,
} from '../src';

describe('server data production contract', () => {
  it('deduplicates concurrent loads and reuses fresh cached data', async () => {
    let calls = 0;
    const resource = createServerData({
      staleTime: 10_000,
      load: async (id: string) => {
        calls += 1;
        await Promise.resolve();
        return { id, calls };
      },
    });

    const [first, second] = await Promise.all([resource.load('project-1'), resource.load('project-1')]);
    expect(first).toEqual({ id: 'project-1', calls: 1 });
    expect(second).toEqual(first);
    expect(calls).toBe(1);
    expect(await resource.load('project-1')).toEqual(first);
    expect(calls).toBe(1);
  });

  it('supports an injectable cache and explicit invalidation', async () => {
    const cache = createMemoryServerDataCache();
    let calls = 0;
    const resource = createServerData({
      cache,
      staleTime: 10_000,
      load: async (id: string) => ({ id, calls: ++calls }),
    });

    expect(await resource.load('a')).toEqual({ id: 'a', calls: 1 });
    await resource.invalidate('a');
    expect(await resource.load('a')).toEqual({ id: 'a', calls: 2 });
    await resource.clear();
    expect(await resource.load('a')).toEqual({ id: 'a', calls: 3 });
  });

  it('passes request and abort signal to the loader', async () => {
    const request = { url: 'https://example.test/projects' } as unknown as Request;
    let received: Request | undefined;
    let signal: AbortSignal | undefined;
    const resource = createServerData({
      load: async (_: string, context) => {
        received = context.request;
        signal = context.signal;
        return 'ok';
      },
    });

    await resource.load('projects', { request });
    expect(received).toBe(request);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);
  });

  it('expires entries after the configured TTL', async () => {
    let now = 1_000;
    const originalNow = Date.now;
    Date.now = () => now;
    try {
      let calls = 0;
      const resource = createServerData({
        staleTime: 100,
        load: async () => ++calls,
      });
      expect(await resource.load('ttl')).toBe(1);
      now += 101;
      expect(await resource.load('ttl')).toBe(2);
    } finally {
      Date.now = originalNow;
    }
  });
});
