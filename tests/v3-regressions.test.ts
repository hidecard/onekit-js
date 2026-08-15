import { create, defineStore, register, renderToString } from '../src/index';

describe('V3 regression coverage', () => {
  it('creates a component with validated props', () => {
    register('regression-card', {
      props: { title: { type: String, required: true } },
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

  it('renders SSR output', async () => {
    const result = renderToString({ tag: 'p', props: {}, children: ['Hello'] } as any);
    expect(result.html).toContain('Hello');
  });
});
