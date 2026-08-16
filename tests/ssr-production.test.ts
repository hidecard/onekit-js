import { TransformStream } from 'node:stream/web';
import { h, renderToString, createSSRContext, setMeta, addToHead, StreamingRenderer } from '../src/index';

(globalThis as typeof globalThis & { TransformStream?: typeof TransformStream }).TransformStream = TransformStream;

describe('SSR production contracts', () => {
  it('escapes text and attribute values', () => {
    const result = renderToString(h('div', { title: 'a"b<&>' }, '<script>alert(1)</script>'));

    expect(result.html).toContain('title="a&quot;b&lt;&amp;&gt;"');
    expect(result.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
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
