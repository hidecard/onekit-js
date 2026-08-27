import { createElement } from '../src/modules/vdom';
import { prerenderRoutes } from '../src/modules/prerender';
import { renderToString } from '../src/modules/ssr';

describe('prerender production contract', () => {
  it('renders unique concrete paths in deterministic order and calls onPage in order', async () => {
    const completed: string[] = [];
    const pages = await prerenderRoutes({
      paths: ['/docs', '/', '/docs', '/about?preview=1'],
      render: ({ path }) => createElement('main', {}, path),
      onPage: page => completed.push(page.path),
    });

    expect(pages.map(page => page.path)).toEqual(['/', '/about?preview=1', '/docs']);
    expect(completed).toEqual(['/', '/about?preview=1', '/docs']);
    expect(pages[0].html).toBe('<main>/</main>');
  });

  it('preserves an existing SSR RenderResult context', async () => {
    const page = await prerenderRoutes({
      paths: ['/reports'],
      render: () => renderToString(createElement('h1', {}, 'Reports'), { head: ['<title>Reports</title>'] }),
    });

    expect(page[0]).toMatchObject({
      path: '/reports',
      html: '<h1>Reports</h1>',
      context: { head: ['<title>Reports</title>'] },
    });
  });

  it('stops before starting another page when the run is aborted', async () => {
    const controller = new AbortController();
    const started: string[] = [];
    await expect(prerenderRoutes({
      paths: ['/', '/next'],
      signal: controller.signal,
      render: ({ path }) => {
        started.push(path);
        controller.abort();
        return createElement('p', {}, path);
      },
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(started).toEqual(['/']);
  });

  it('rejects traversal-shaped and non-absolute paths', async () => {
    await expect(prerenderRoutes({ paths: ['/../private'], render: () => 'ignored' })).rejects.toThrow(/traversal/);
    await expect(prerenderRoutes({ paths: ['relative'], render: () => 'ignored' })).rejects.toThrow(/absolute URL paths/);
  });
});
