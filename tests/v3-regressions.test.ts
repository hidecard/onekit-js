import { create, defineComponent, defineStore, nextTick, register, renderToString } from '../src/index';
import { compileTemplate } from '../src/modules/template';

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

  it('rejects statement and global access expressions', () => {
    const state = { value: 'safe' };
    const element = compileTemplate('<p ok-if="window.alert(1)">Safe</p>', state);
    expect((element as HTMLElement).style.display).toBe('none');
  });
});
