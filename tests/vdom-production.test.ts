import { createElement, patch, render } from '../src/index';

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

  it('assigns refs to rendered elements', () => {
    const root = document.createElement('div');
    const ref: { current?: Element } = {};
    const vnode = createElement('input', { ref });

    patch(root, vnode);

    expect(ref.current).toBe(root.firstElementChild);
  });
});
