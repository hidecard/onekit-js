import { createApp } from '../src/index';

describe('createApp ergonomic component flow', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts a setup component directly with initial props', () => {
    const app = createApp({
      name: 'GreetingApp',
      setup: (props) => ({
        message: String(props.message ?? 'Hello'),
      }),
      template: '<article><h1>{{message}}</h1></article>',
    });

    const target = document.createElement('main');
    document.body.appendChild(target);
    const instance = app.mount(target, { message: 'OneKit' });

    expect(instance?.mounted).toBe(true);
    expect(target.querySelector('h1')?.textContent).toBe('OneKit');

    app.unmount();
    expect(target.firstElementChild).toBeNull();
  });
});
