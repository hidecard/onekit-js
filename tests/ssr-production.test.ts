import { h, renderToString, createSSRContext, setMeta, addToHead } from '../src/index';

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
