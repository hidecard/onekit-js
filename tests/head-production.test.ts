import { applyHead, createHeadManager, renderHead } from '../src/index';

describe('head metadata production contracts', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="existing" content="keep">';
  });

  it('renders escaped SSR metadata with Open Graph and Twitter tags', () => {
    const html = renderHead({
      title: 'OneKit <V3>',
      description: 'A compact framework',
      keywords: ['framework', 'SSR'],
      canonical: 'https://example.test/docs?a=1&b=2',
      openGraph: { title: 'OneKit V3', type: 'website' },
      twitter: { card: 'summary' },
    });

    expect(html).toContain('<title>OneKit &lt;V3&gt;</title>');
    expect(html).toContain('name="description"');
    expect(html).toContain('content="framework, SSR"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('href="https://example.test/docs?a=1&amp;b=2"');
  });

  it('updates only manager-owned nodes and cleans them up', () => {
    const manager = createHeadManager({ title: 'Home', description: 'Initial' });
    manager.mount(document);

    expect(document.head.querySelector('meta[name="existing"]')).not.toBeNull();
    expect(document.head.querySelector('title')?.textContent).toBe('Home');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Initial');

    manager.update({ title: 'About', openGraph: { title: 'About page' } });
    expect(document.head.querySelector('title')?.textContent).toBe('About');
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('About page');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Initial');

    manager.dispose();
    expect(document.head.querySelector('title')).toBeNull();
    expect(document.head.querySelector('meta[name="existing"]')).not.toBeNull();
  });

  it('applies metadata without removing application-owned head nodes', () => {
    applyHead({ robots: 'index,follow', canonical: '/home' }, document);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('/home');
    expect(document.head.querySelector('meta[name="existing"]')).not.toBeNull();
  });
});
