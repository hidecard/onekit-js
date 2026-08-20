import { createElement, patch, render } from '../src/modules/vdom';
import { component } from '../src/modules/jsx';
import { getInstance } from '../src/modules/component';
import { Fragment, jsx, jsxs } from '../src/jsx-runtime';

describe('M3 renderer production contract', () => {
  it('creates and updates DOM props and text', () => {
    const root = document.createElement('div');
    const first = createElement('button', { className: 'first', disabled: true }, 'Save');
    const next = createElement('button', { className: 'next', disabled: false }, 'Updated');

    patch(root, first);
    patch(root, next, first);

    expect(root.innerHTML).toBe('<button class="next">Updated</button>');
  });

  it('reconciles keyed children without recreating retained nodes', () => {
    const root = document.createElement('div');
    const first = createElement('ul', {},
      createElement('li', { key: 'a' }, 'A'),
      createElement('li', { key: 'b' }, 'B')
    );
    const firstElement = render(first) as Element;
    root.appendChild(firstElement);
    const retained = firstElement.children[1];
    const next = createElement('ul', {},
      createElement('li', { key: 'b' }, 'B updated'),
      createElement('li', { key: 'a' }, 'A')
    );

    patch(root, next, first);

    expect(root.firstElementChild?.textContent).toBe('B updatedA');
    expect(root.firstElementChild?.children[0]).toBe(retained);
  });

  it('blocks unsafe URLs, string event attributes, and dangerous style values', () => {
    const root = document.createElement('div');
    const vnode = createElement('a', {
      HREF: 'javascript:alert(1)',
      ONCLICK: 'alert(1)',
      style: { backgroundImage: 'url(javascript:alert(1))', color: 'red' },
    }, 'unsafe');

    patch(root, vnode);

    const link = root.firstElementChild as HTMLAnchorElement;
    expect(link.hasAttribute('href')).toBe(false);
    expect(link.hasAttribute('onclick')).toBe(false);
    expect(link.style.backgroundImage).toBe('');
    expect(link.style.color).toBe('red');
  });

  it('replaces event handlers and removes stale props', () => {
    const root = document.createElement('div');
    const firstCalls: string[] = [];
    const secondCalls: string[] = [];
    const firstHandler = () => firstCalls.push('first');
    const secondHandler = () => secondCalls.push('second');
    const first = createElement('button', { onClick: firstHandler, title: 'old' }, 'Click');
    const next = createElement('button', { onClick: secondHandler }, 'Click');

    patch(root, first);
    patch(root, next, first);
    (root.firstElementChild as HTMLButtonElement).click();

    expect(firstCalls).toEqual([]);
    expect(secondCalls).toEqual(['second']);
    expect(root.firstElementChild?.hasAttribute('title')).toBe(false);
  });

  it('disposes event listeners when a subtree is replaced', () => {
    const root = document.createElement('div');
    const calls: string[] = [];
    const old = createElement('button', { onClick: () => calls.push('stale') }, 'Old');
    patch(root, old);
    const oldElement = root.firstElementChild as HTMLButtonElement;

    patch(root, createElement('span', {}, 'New'), old);
    oldElement.click();

    expect(calls).toEqual([]);
  });

  it('updates fragments without leaving stale or misplaced nodes', () => {
    const root = document.createElement('div');
    const first = createElement('fragment', {},
      createElement('span', {}, 'A'),
      createElement('span', {}, 'B')
    );
    const next = createElement('fragment', {},
      createElement('strong', {}, 'Only')
    );

    patch(root, first);
    patch(root, next, first);

    expect(root.innerHTML).toBe('<strong>Only</strong>');
  });

  it('handles a fragment nested inside an element update', () => {
    const root = document.createElement('div');
    const first = createElement('section', {},
      createElement('fragment', {},
        createElement('i', {}, 'one'),
        createElement('i', {}, 'two')
      ),
      createElement('em', {}, 'tail')
    );
    const next = createElement('section', {},
      createElement('fragment', {}, createElement('b', {}, 'new')),
      createElement('em', {}, 'tail')
    );

    patch(root, first);
    patch(root, next, first);

    expect(root.innerHTML).toBe('<section><b>new</b><em>tail</em></section>');
  });

  it('supports the automatic JSX runtime contract for single and multiple children', () => {
    const single = jsx('button', { type: 'button', children: 'Save' }, 'save');
    const multiple = jsxs('div', {
      children: [jsx('span', { children: 'A' }), jsx('span', { children: 'B' })],
    });
    const fragment = jsx(Fragment, { children: [single, multiple] });

    expect(single).toMatchObject({ tag: 'button', key: 'save', props: { type: 'button' }, children: ['Save'] });
    expect(multiple.children).toHaveLength(2);
    expect(fragment.tag).toBe(Fragment);
  });

  it('assigns and clears refs across replacement', () => {
    const root = document.createElement('div');
    const ref: { current?: Element | null } = {};
    const vnode = createElement('input', { ref });

    patch(root, vnode);
    expect(ref.current).toBe(root.firstElementChild);

    patch(root, createElement('span', {}, 'replacement'), vnode);
    expect(ref.current).toBeNull();
  });

  it('keeps controlled input properties synchronized', () => {
    const root = document.createElement('div');
    const first = createElement('input', { value: 'first', checked: true });
    const next = createElement('input', { value: 'second', checked: false });

    patch(root, first);
    patch(root, next, first);

    const input = root.firstElementChild as HTMLInputElement;
    expect(input.value).toBe('second');
    expect(input.checked).toBe(false);
  });

  it('preserves keyed nodes across mixed keyed and unkeyed insertions', () => {
    const root = document.createElement('div');
    const first = createElement('div', {},
      createElement('span', { key: 'stable' }, 'stable'),
      createElement('span', {}, 'unkeyed'),
    );
    patch(root, first);
    const stable = root.firstElementChild?.firstElementChild;

    const next = createElement('div', {},
      createElement('span', {}, 'new unkeyed'),
      createElement('span', { key: 'stable' }, 'updated stable'),
    );
    patch(root, next, first);

    expect(root.firstElementChild?.textContent).toBe('new unkeyedupdated stable');
    expect(root.firstElementChild?.children[1]).toBe(stable);
  });

  it('removes unused keyed nodes and cleans their event ownership', () => {
    const root = document.createElement('div');
    const calls: string[] = [];
    const old = createElement('div', {},
      createElement('button', { key: 'remove', onClick: () => calls.push('stale') }, 'remove'),
      createElement('button', { key: 'keep' }, 'keep'),
    );
    patch(root, old);
    const removed = root.firstElementChild?.firstElementChild as HTMLButtonElement;

    const next = createElement('div', {}, createElement('button', { key: 'keep' }, 'keep'));
    patch(root, next, old);
    removed.click();

    expect(calls).toEqual([]);
    expect(root.firstElementChild?.children).toHaveLength(1);
    expect(root.firstElementChild?.textContent).toBe('keep');
  });

  it('reuses keyed function component DOM identity while updating props', () => {
    const root = document.createElement('div');
    const Label = (props: Record<string, unknown>) => createElement('li', {}, String(props.label));
    const first = createElement('ul', {},
      createElement(Label, { key: 'a', label: 'A' }),
      createElement(Label, { key: 'b', label: 'B' }),
    );
    patch(root, first);
    const retained = root.firstElementChild?.firstElementChild;

    const next = createElement('ul', {},
      createElement(Label, { key: 'b', label: 'B updated' }),
      createElement(Label, { key: 'a', label: 'A' }),
    );
    patch(root, next, first);

    expect(root.firstElementChild?.textContent).toBe('B updatedA');
    expect(root.firstElementChild?.children[1]).toBe(retained);
  });

  it('preserves keyed stateful component instances and runs unmount cleanup', () => {
    const root = document.createElement('div');
    const lifecycle: string[] = [];
    const Counter = component({
      name: 'StatefulCounter',
      data: () => ({ count: 0 }),
      mounted() { lifecycle.push(`mounted:${this.props.label}`); },
      unmounted() { lifecycle.push(`unmounted:${this.props.label}`); },
      template: '<p class="counter">{{label}}:{{count}}</p>',
    });
    const first = createElement('section', {},
      createElement(Counter, { key: 'a', label: 'A' }),
      createElement(Counter, { key: 'b', label: 'B' }),
    );
    patch(root, first);
    const retained = root.firstElementChild?.firstElementChild as Element;
    const instance = getInstance(retained);
    if (!instance) throw new Error('stateful instance was not registered');
    instance.state.count = 7;

    const next = createElement('section', {},
      createElement(Counter, { key: 'b', label: 'B' }),
      createElement(Counter, { key: 'a', label: 'A updated' }),
    );
    patch(root, next, first);

    expect(root.firstElementChild?.textContent).toContain('A updated:7');
    expect(root.firstElementChild?.children[1]).toBe(retained);
    expect(lifecycle).toEqual(['mounted:A', 'mounted:B']);

    const removeA = createElement('section', {}, createElement(Counter, { key: 'b', label: 'B' }));
    patch(root, removeA, next);
    expect(lifecycle).toContain('unmounted:A updated');
  });
});
