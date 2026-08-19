import { TransformStream } from 'node:stream/web';
import {
  h,
  hydrate,
  renderToString,
  createSSRContext,
  setMeta,
  addToHead,
  StreamingRenderer,
  createStreamingBoundary,
  resumeStreamingBoundaryChunk,
} from '../src/index';

(globalThis as typeof globalThis & { TransformStream?: typeof TransformStream }).TransformStream = TransformStream;

describe('SSR production contracts', () => {
  it('escapes text and attribute values', () => {
    const result = renderToString(h('div', { title: 'a"b<&>' }, '<script>alert(1)</script>'));

    expect(result.html).toContain('title="a&quot;b&lt;&amp;&gt;"');
    expect(result.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('omits unsafe URL and event attributes while filtering dangerous styles', () => {
    const result = renderToString(h('a', {
      HREF: 'javascript:alert(1)',
      ONCLICK: 'alert(1)',
      style: { backgroundImage: 'url(javascript:alert(1))', color: 'red' },
    }, 'safe text'));

    expect(result.html).toBe('<a style="color:red">safe text</a>');
  });

  it('renders context meta without corrupting the content buffer', () => {
    const context = createSSRContext();
    setMeta(context, 'description', 'OneKit & V3');

    const result = renderToString(h('html', {}, h('head'), h('body', {}, 'app')), context);

    expect(result.html).toContain('<meta name="description" content="OneKit &amp; V3">');
    expect(result.html).toContain('<body>app</body>');
  });

  it('propagates the original async component error through the stream', async () => {
    const failure = new Error('async component failed');
    const onError = jest.fn();
    const renderer = new StreamingRenderer();
    const stream = await renderer.renderToStream(
      h('main', {}, h('p', {}, 'before'), h(async () => { throw failure; })),
      { onError },
    );
    const reader = stream.getReader();
    const chunks: string[] = [];
    const consume = (async () => {
      while (true) {
        const result = await reader.read();
        if (result.done) return;
        chunks.push(result.value);
      }
    })();

    await expect(consume).rejects.toBe(failure);
    expect(onError).toHaveBeenCalledWith(failure);
    expect(chunks.join('')).toContain('<main><p>before</p>');
  });

  it('schedules promise children in source order without losing async values', async () => {
    const renderer = new StreamingRenderer();
    const stream = await renderer.renderToStream(h('main', {}, [
      Promise.resolve(h('span', {}, 'first')),
      new Promise(resolve => setTimeout(() => resolve(h('span', {}, 'second')), 5)),
    ]));
    const reader = stream.getReader();
    let html = '';
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      html += result.value;
    }

    expect(html).toContain('<main><span>first</span><span>second</span></main>');
  });

  it('streams fallback and resolved content for progressive boundaries', async () => {
    const renderer = new StreamingRenderer();
    const stream = await renderer.renderToStream(h('main', {}, createStreamingBoundary(
      new Promise(resolve => setTimeout(() => resolve(h('span', {}, 'ready')), 5)),
      h('span', {}, 'loading'),
      { id: 'profile' },
    )));
    const reader = stream.getReader();
    const chunks: string[] = [];
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
    }
    expect(chunks.join('')).toContain('<div data-okjs-boundary="profile"><span>loading</span></div>');
    expect(chunks.join('')).toContain('<template data-okjs-boundary-content="profile"><span>ready</span></template>');
  });

  it('allows adapters to schedule deferred boundary payloads', async () => {
    const boundaries: string[] = [];
    const renderer = new StreamingRenderer();
    const stream = await renderer.renderToStream(h('main', {}, createStreamingBoundary(
      Promise.resolve(h('span', {}, 'scheduled')),
      h('span', {}, 'loading'),
      { id: 'scheduled-boundary' },
    )), {
      scheduleBoundary: async (task, boundary) => {
        boundaries.push(boundary.id);
        await Promise.resolve();
        await task();
      },
    });
    const reader = stream.getReader();
    let html = '';
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      html += result.value;
    }

    expect(boundaries).toEqual(['scheduled-boundary']);
    expect(html).toContain('<div data-okjs-boundary="scheduled-boundary"><span>loading</span></div>');
    expect(html).toContain('<template data-okjs-boundary-content="scheduled-boundary"><span>scheduled</span></template>');
  });

  it('resumes a streamed boundary chunk in the client shell', () => {
    document.body.innerHTML = '<main><div data-okjs-boundary="profile"><span>loading</span></div></main>';
    const applied = resumeStreamingBoundaryChunk(
      document.body,
      '<template data-okjs-boundary-content="profile"><span>ready</span></template>',
    );
    expect(applied).toBe(true);
    expect(document.body.innerHTML).toContain('<span>ready</span>');
    expect(document.body.innerHTML).not.toContain('loading');
  });

  it('supports a promise as the streamed root vnode', async () => {
    const renderer = new StreamingRenderer();
    const stream = await renderer.renderToStream(Promise.resolve(h('div', {}, 'async root')));
    const reader = stream.getReader();
    let html = '';
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      html += result.value;
    }
    expect(html).toContain('<div>async root</div>');
  });

  it('aborts a stream with AbortError without masking the cancellation', async () => {
    const controller = new AbortController();
    const onError = jest.fn();
    const renderer = new StreamingRenderer();
    const stream = await renderer.renderToStream(
      h('div', {}, h(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return h('span', {}, 'late');
      })),
      { signal: controller.signal, onError },
    );
    const reader = stream.getReader();
    const consume = (async () => {
      while (true) {
        const result = await reader.read();
        if (result.done) return;
      }
    })();
    controller.abort();

    await expect(consume).rejects.toMatchObject({ name: 'AbortError' });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: 'AbortError' }));
  });

  it('reports hydration attribute mismatches while attaching events', () => {
    document.body.innerHTML = '<button class="server">Count: 0</button>';
    const root = document.body.firstElementChild!;
    const clicks: number[] = [];
    const result = hydrate(root, h('button', {
      className: 'client',
      onClick: () => clicks.push(1),
    }, 'Count: 0'));

    expect(result.mismatches).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'attribute', path: 'root[class]', expected: 'client', actual: 'server' }),
    ]));
    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clicks).toEqual([1]);
    result.dispose();
    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clicks).toEqual([1]);
  });

  it('propagates context into nested document nodes', () => {
    const context = createSSRContext();
    addToHead(context, '<title>OneKit</title>');

    const result = renderToString(
      h('html', {}, h('head', {}, h('meta', { charset: 'utf-8' })), h('body', {}, h('main', {}, 'content'))),
      context,
    );

    expect(result.html).toContain('<title>OneKit</title>');
    expect(result.html).toContain('<main>content</main>');
  });
});
