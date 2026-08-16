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

  it('matches case-insensitive attributes, boolean props, and object styles', () => {
    document.body.innerHTML = '<input id="app" CLASS="field" DISABLED style="color:red;background:blue">';
    const root = document.querySelector('#app') as HTMLInputElement;

    const result = hydrate(root, h('input', {
      className: 'field',
      disabled: true,
      style: { color: 'red', background: 'blue' },
    }));

    expect(result.mismatches).toEqual([]);
  });

  it('preserves meaningful whitespace while ignoring no nodes implicitly', () => {
    document.body.innerHTML = '<p id="app"> Hello <strong>world</strong> </p>';
    const root = document.querySelector('#app') as HTMLElement;

    const result = hydrate(root, h('p', {}, ' Hello ', h('strong', {}, 'world'), ' '));

    expect(result.mismatches).toEqual([]);
  });

  it('hydrates fragments and nested component output without rewriting DOM', () => {
    document.body.innerHTML = '<div id="app"><span>A</span><span>B</span></div>';
    const root = document.querySelector('#app') as HTMLElement;
    const Pair = () => h('fragment', {}, h('span', {}, 'A'), h('span', {}, 'B'));

    const result = hydrate(root, h(Pair, {}));

    expect(result.mismatches).toEqual([]);
    expect(root.innerHTML).toBe('<span>A</span><span>B</span>');
  });
});
