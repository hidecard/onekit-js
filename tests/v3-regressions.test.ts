import { create, defineComponent, defineStore, nextTick, register, renderToString } from '../src/index';

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
});
