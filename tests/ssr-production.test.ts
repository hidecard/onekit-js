import { TransformStream } from 'node:stream/web';
import { h, hydrate, renderToString, createSSRContext, setMeta, addToHead, StreamingRenderer } from '../src/index';

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
    const renderer = new StreamingRenderer();
    const stream = await renderer.renderToStream(
      h('main', {}, h('p', {}, 'before'), h(async () => { throw failure; })),
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
    const renderer = new StreamingRenderer();
    const stream = await renderer.renderToStream(
      h('div', {}, h(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return h('span', {}, 'late');
      })),
      { signal: controller.signal },
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
