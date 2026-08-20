import { component, create, h, hydrate, unmount } from '../src/index';

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

  it('exposes structured mismatch state and supports an opt-in throw policy', () => {
    document.body.innerHTML = '<section id="app">Server</section>';
    const root = document.querySelector('#app') as HTMLElement;
    const onMismatch = jest.fn();

    const result = hydrate(root, h('main', {}, 'Client'), { onMismatch });

    expect(result.hasMismatch).toBe(true);
    expect(result.firstMismatch).toEqual({
      path: 'root',
      kind: 'tag',
      expected: 'main',
      actual: 'section',
    });
    expect(onMismatch).toHaveBeenCalledTimes(2);
    expect(() => hydrate(root, h('main', {}, 'Client'), { throwOnMismatch: true }))
      .toThrow(expect.objectContaining({ name: 'HydrationMismatchError' }));
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

  it('binds stateful component instances to server-rendered roots and runs mounted once', () => {
    document.body.innerHTML = '<article id="app"><span>Server</span></article>';
    const root = document.querySelector('#app') as HTMLElement;
    const lifecycle: string[] = [];
    const Counter = component({
      name: 'HydratedCounter',
      data: () => ({ count: 7 }),
      mounted() { lifecycle.push(`mounted:${this.state.count}`); },
      template: '<article><span>{{count}}</span></article>',
    });
    const vnode = h(Counter, {});

    const result = hydrate(root, vnode);

    expect(result.mismatches).toEqual([]);
    expect(lifecycle).toEqual(['mounted:7']);
    expect((root as HTMLElement & { _componentInstance?: unknown })._componentInstance).toBeDefined();
    expect((root as HTMLElement & { _componentVNode?: unknown })._componentVNode).toBe(vnode);
    expect(root.innerHTML).toBe('<span>Server</span>');

    result.dispose();
    expect(lifecycle).toEqual(['mounted:7']);
    expect((root as HTMLElement & { _componentInstance?: unknown })._componentInstance).toBeUndefined();
  });

  it('preserves named VNode slots when creating a stateful component', () => {
    const SlotCard = component({
      name: 'HydratedSlotCard',
      render() {
        const title = this.slots.title;
        return h('article', {}, Array.isArray(title) ? title : title as any);
      },
    });
    const title = h('h1', { slot: 'title' }, 'Projected');
    const vnode = h(SlotCard, {}, title);
    const instance = create('HydratedSlotCard', { children: [title] });

    expect(instance?.slots.title).toBe(title);
    if (instance) unmount(instance);

    const result = hydrate(document.body.appendChild(document.createElement('article')), vnode);

    expect(result.mismatches).toEqual([]);
    result.dispose();
  });

  it('hydrates non-string VNode children and cleans callback/object refs', () => {
    document.body.innerHTML = '<div id="app"><strong>slot</strong></div>';
    const root = document.querySelector('#app') as HTMLElement;
    const callbackRef = jest.fn();
    const objectRef: { current?: Element | null } = {};
    const vnode = h('div', { ref: callbackRef }, h('strong', { ref: objectRef }, 'slot'));

    const result = hydrate(root, vnode);

    expect(result.mismatches).toEqual([]);
    expect(callbackRef).toHaveBeenCalledWith(root);
    expect(objectRef.current).toBe(root.firstElementChild);

    result.dispose();

    expect(callbackRef).toHaveBeenLastCalledWith(null);
    expect(objectRef.current).toBeNull();
  });
});
