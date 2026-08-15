import { h } from '../src/index';

describe('runtime production contracts', () => {
  it('supports hyperscript h(tag, props, children)', () => {
    const vnode = h('main', { class: 'shell' }, h('strong', null, 'OneKit')) as any;
    expect(vnode.tag).toBe('main');
    expect(vnode.children[0].tag).toBe('strong');
    expect(vnode.children[0].children).toEqual(['OneKit']);
  });
});
