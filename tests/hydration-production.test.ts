import { h, hydrate } from '../src/index';

describe('hydration production contracts', () => {
  it('attaches event listeners and disposes them', () => {
    document.body.innerHTML = '<button id="app">Count</button>';
    const root = document.querySelector('#app') as HTMLButtonElement;
    const handler = jest.fn();

    const result = hydrate(root, h('button', { onClick: handler }, 'Count'));
    root.click();
    expect(handler).toHaveBeenCalledTimes(1);

    result.dispose();
    root.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.mismatches).toEqual([]);
  });

  it('reports tag and text mismatches without rewriting server DOM', () => {
    document.body.innerHTML = '<section id="app">Server</section>';
    const root = document.querySelector('#app') as HTMLElement;

    const result = hydrate(root, h('main', {}, 'Client'));

    expect(result.mismatches).toEqual([
      { path: 'root', kind: 'tag', expected: 'main', actual: 'section' },
      { path: 'root.0', kind: 'text', expected: 'Client', actual: 'Server' },
    ]);
    expect(root.outerHTML).toBe('<section id="app">Server</section>');
  });
});
