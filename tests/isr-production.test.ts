import { createQueryClient } from '../src/modules/query';
import { createElement } from '../src/modules/vdom';
import { createISRRenderer, createMemoryISRCache } from '../src/modules/isr';

describe('ISR cache-aware revalidation contract', () => {
  it('returns hits while fresh and stale pages while regenerating in the background', async () => {
    let now = 1_000;
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
    let renders = 0;
    const renderer = createISRRenderer({
      cache: createMemoryISRCache(),
      revalidate: 100,
      render: ({ path }) => createElement('main', {}, `${path}:${++renders}`),
    });

    const first = await renderer.renderISRPage('/docs');
    expect(first.status).toBe('miss');
    expect(first.html).toBe('<main>/docs:1</main>');

    now = 1_050;
    const hit = await renderer.renderISRPage('/docs');
    expect(hit.status).toBe('hit');
    expect(hit.html).toBe(first.html);

    now = 1_200;
    const stale = await renderer.renderISRPage('/docs');
    expect(stale.status).toBe('stale');
    expect(stale.html).toBe(first.html);
    await stale.revalidation;
    expect(renders).toBe(2);
    clock.mockRestore();
  });

  it('shares one regeneration for concurrent requests of a missing path', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let renders = 0;
    const renderer = createISRRenderer({
      cache: createMemoryISRCache(),
      revalidate: 1_000,
      render: async ({ path }) => {
        renders += 1;
        await gate;
        return createElement('p', {}, `${path}:${renders}`);
      },
    });

    const first = renderer.renderISRPage('/single-flight');
    const second = renderer.renderISRPage('/single-flight');
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(renders).toBe(1);
    release();
    const pages = await Promise.all([first, second]);
    expect(pages.map(page => page.status)).toEqual(['miss', 'miss']);
    expect(pages[0].html).toBe(pages[1].html);
    expect(renders).toBe(1);
  });

  it('invalidates and regenerates tagged pages together with QueryClient tags', async () => {
    let queryLoads = 0;
    const queryClient = createQueryClient({ revalidateOnWindowFocus: false, revalidateOnReconnect: false });
    await queryClient.fetch('docs-data', () => ({ version: ++queryLoads }), { tags: ['docs'], revalidate: 60_000 });
    let pageRenders = 0;
    const renderer = createISRRenderer({
      cache: createMemoryISRCache(),
      revalidate: 60_000,
      tags: ['docs'],
      queryClient,
      render: ({ path }) => createElement('main', {}, `${path}:${++pageRenders}`),
    });

    await renderer.renderISRPage('/docs');
    const refreshed = await renderer.revalidateTag('docs');
    expect(refreshed).toHaveLength(1);
    expect(refreshed[0].html).toBe('<main>/docs:2</main>');
    expect(queryLoads).toBe(2);
    expect(queryClient.getState('docs-data').updatedAt).toBeGreaterThan(0);
    queryClient.dispose();
  });

  it('invalidates tagged entries discovered from the cache adapter', async () => {
    const cache = createMemoryISRCache();
    await cache.set('/preloaded', {
      path: '/preloaded',
      html: '<main>cached</main>',
      context: {},
      generatedAt: Date.now(),
      revalidate: 60_000,
      tags: ['docs'],
    });
    const renderer = createISRRenderer({ cache, render: ({ path }) => createElement('main', {}, path) });

    await renderer.invalidateTag('docs');
    expect(cache.entries()[0].generatedAt).toBe(0);
  });

  it('keeps the last good page when background regeneration fails', async () => {
    let now = 1_000;
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
    let renders = 0;
    const renderer = createISRRenderer({
      cache: createMemoryISRCache(),
      revalidate: 10,
      render: ({ path }) => {
        renders += 1;
        if (renders > 1) throw new Error('refresh failed');
        return createElement('main', {}, path);
      },
    });

    await renderer.renderISRPage('/stable');
    now = 1_020;
    const stale = await renderer.renderISRPage('/stable');
    await expect(stale.revalidation).rejects.toThrow('refresh failed');
    expect(stale.html).toBe('<main>/stable</main>');
    clock.mockRestore();
  });

  it('rejects invalid paths and invalid freshness values', async () => {
    const renderer = createISRRenderer({
      cache: createMemoryISRCache(),
      revalidate: -1,
      render: () => 'ignored',
    });
    await expect(renderer.renderISRPage('/bad')).rejects.toThrow('non-negative');
    await expect(renderer.renderISRPage('/../private')).rejects.toThrow('traversal');
  });
});
