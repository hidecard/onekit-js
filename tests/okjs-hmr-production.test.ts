import { create, defineComponent, hotUpdateComponent, mount, register } from '../src';

describe('.okjs HMR component update contract', () => {
  it('preserves live component state while applying a new template/script definition', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    register('HotCounter', defineComponent({
      name: 'HotCounter',
      data: () => ({ count: 0 }),
      template: '<p class="value">{{count}}</p>',
    }));
    const instance = create('HotCounter');
    expect(instance).not.toBeNull();
    if (!instance) return;
    mount(instance, target);
    instance.state.count = 7;
    expect(target.querySelector('.value')?.textContent).toBe('7');

    const replaced = hotUpdateComponent('HotCounter', defineComponent({
      name: 'HotCounter',
      data: () => ({ count: 0 }),
      methods: {
        label(this: any) {
          return `Updated ${this.state.count}`;
        },
      },
      template: '<strong class="value">Updated {{count}}</strong>',
    }));

    expect(replaced).toBe(1);
    expect(target.querySelector('strong.value')?.textContent).toBe('Updated 7');
    expect(target.querySelector('p.value')).toBeNull();
  });
});
