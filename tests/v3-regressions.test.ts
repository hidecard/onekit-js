import { create, createStoreRegistry, defineComponent, defineStore, mount, nextTick, register, renderToString, useStore } from '../src/index';
import { compileTemplate } from '../src/modules/template';
import { reactive } from '../src/modules/reactive';

describe('V3 regression coverage', () => {
  it('creates a component with validated props', () => {
    register('regression-card', {
      props: { title: { type: 'string', required: true } },
      template: '<article><h1>{{title}}</h1></article>'
    });

    const instance = create('regression-card', { title: 'Working' });
    expect(instance?.props.title).toBe('Working');
    expect(instance?.element).not.toBeNull();
  });

  it('replaces the component root instead of nesting a duplicate on update', () => {
    register('single-root-card', {
      data: () => ({ count: 0 }),
      methods: {
        increment(this: any) {
          this.state.count += 1;
          this.update();
        },
      },
      template: '<article><button ok-on.click="increment()">{{count}}</button></article>',
    });

    const target = document.createElement('div');
    document.body.appendChild(target);
    const instance = create('single-root-card');
    expect(instance).not.toBeNull();
    mount(instance!, target);
    (target.querySelector('button') as HTMLButtonElement).click();
    (target.querySelector('button') as HTMLButtonElement).click();

    expect(target.children).toHaveLength(1);
    expect(target.querySelector('button')?.textContent).toBe('2');
    target.remove();
  });

  it('creates a store without duplicate export conflicts', () => {
    const store = defineStore('regression-store', () => ({
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          (this.$state.count as number) += 1;
        }
      }
    }));

    store.increment();
    expect(store.$state.count).toBe(1);
  });

  it('resets store shape and disposes the store from the registry', () => {
    const id = `regression-store-lifecycle-${Date.now()}`;
    const store = defineStore(id, () => ({ state: () => ({ count: 0 }) }));
    const subscriber = jest.fn();
    store.$subscribe(subscriber);
    store.$patch(state => {
      state.count = 2;
      state.transient = true;
    });
    store.$reset();

    expect(store.$state).toEqual({ count: 0 });
    expect(subscriber).toHaveBeenLastCalledWith({ storeId: id, type: 'reset' }, { count: 0 });
    store.$dispose();
    expect(() => useStore(id)).toThrow(`Store \"${id}\" not found`);
    store.$patch({ count: 3 });
    expect(subscriber).toHaveBeenCalledTimes(2);
  });

  it('isolates stores created in separate registries', () => {
    const first = createStoreRegistry();
    const second = createStoreRegistry();
    const id = `registry-isolation-${Date.now()}`;
    const firstStore = first.defineStore(id, () => ({ state: () => ({ owner: 'first' }) }));
    const secondStore = second.defineStore(id, () => ({ state: () => ({ owner: 'second' }) }));

    expect(first.useStore(id)).toBe(firstStore);
    expect(second.useStore(id)).toBe(secondStore);
    expect(first.useStore(id).$state).toEqual({ owner: 'first' });
    expect(second.useStore(id).$state).toEqual({ owner: 'second' });
    expect(() => useStore(id)).toThrow(`Store \"${id}\" not found`);
    first.dispose();
    second.dispose();
  });

  it('supports framework ergonomic helpers', async () => {
    const definition = defineComponent({ template: '<p>ok</p>' });
    expect(definition.template).toBe('<p>ok</p>');
    const marker: string[] = [];
    await nextTick(() => marker.push('flushed'));
    expect(marker).toEqual(['flushed']);
  });

  it('renders SSR output', () => {
    const result = renderToString({ tag: 'p', props: {}, children: ['Hello'] } as any);
    expect(result.html).toContain('Hello');
  });

  it('preserves directives through sanitization and uses the root context for events and models', () => {
    const state: { user: { name: string }; clicks: number; increment: () => void } = {
      user: { name: 'Before' },
      clicks: 0,
      increment: () => {
        state.clicks += 1;
      }
    };
    const element = compileTemplate(
      '<section><button ok-on.click="increment()">Click</button><input ok-model="user.name"></section>',
      state
    );

    const button = element.querySelector('button') as HTMLButtonElement;
    const input = element.querySelector('input') as HTMLInputElement;
    expect(button).not.toBeNull();
    button.click();
    expect(state.clicks).toBe(1);
    input.value = 'After';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(state.user.name).toBe('After');
  });

  it('updates only the interpolated text node for reactive state changes', async () => {
    const state = reactive({ count: 1 });
    const element = compileTemplate('<section><span>{{count}}</span><b>stable</b></section>', state);
    const span = element.querySelector('span') as HTMLSpanElement;
    const sibling = element.querySelector('b');
    expect(span.textContent).toBe('1');
    state.count = 2;
    await Promise.resolve();
    expect(span.textContent).toBe('2');
    expect(element.querySelector('b')).toBe(sibling);
  });

  it('preserves keyed list DOM nodes when collection order changes', async () => {
    const state = reactive({
      items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    });
    const element = compileTemplate('<ul><li ok-for="item in items">{{item.label}}</li></ul>', state);
    const first = element.querySelectorAll('li')[0];
    const second = element.querySelectorAll('li')[1];
    state.items = [{ id: 'b', label: 'B2' }, { id: 'a', label: 'A' }];
    await Promise.resolve();

    const nodes = Array.from(element.querySelectorAll('li'));
    expect(nodes[0]).toBe(second);
    expect(nodes[1]).toBe(first);
    expect(nodes[0].textContent).toBe('B2');
  });

  it('warns on duplicate keyed list items without reusing one DOM node twice', () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const state = reactive({ items: [{ id: 'same', label: 'A' }, { id: 'same', label: 'B' }] });
    const element = compileTemplate('<ul><li ok-for="item in items">{{item.label}}</li></ul>', state);
    const nodes = Array.from(element.querySelectorAll('li'));

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).not.toBe(nodes[1]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Duplicate ok-for key'));
    warning.mockRestore();
  });

  it('rejects statement/global expressions and unsafe dynamic URLs', () => {
    const state = { value: 'safe', url: 'javascript:alert(1)' };
    const element = compileTemplate('<section><p ok-if="window.alert(1)">Safe</p><a ok-bind.href="url">Link</a></section>', state);
    expect((element.querySelector('p') as HTMLElement).style.display).toBe('none');
    expect(element.querySelector('a')?.getAttribute('href')).toBeNull();
  });
});
