import {
  createRouter,
  defineStore,
  effect,
  effectScope,
  getActiveScopeDiagnostics,
  onScopeDispose,
  reactive,
} from '../src/index';

describe('V3 disposable scopes', () => {
  it('stops effects registered inside a scope', () => {
    const state = reactive({ count: 0 });
    const seen: number[] = [];
    const scope = effectScope(true);

    scope.run(() => effect(() => seen.push(state.count)));
    state.count = 1;
    scope.dispose();
    state.count = 2;

    expect(seen).toEqual([0, 1]);
    expect(scope.disposed).toBe(true);
  });

  it('disposes nested resources in reverse ownership order', () => {
    const order: string[] = [];
    const scope = effectScope(true);
    scope.run(() => {
      onScopeDispose(() => order.push('parent'));
      const child = effectScope();
      child.run(() => onScopeDispose(() => order.push('child')));
    });

    scope.dispose();
    expect(order).toEqual(['child', 'parent']);
  });

  it('automatically removes router and store subscriptions', async () => {
    const store = defineStore(`scope-${Date.now()}`, () => ({
      state: () => ({ count: 0 }),
      actions: { increment() { this.$state.count = Number(this.$state.count) + 1; } },
    }));
    const router = createRouter([{ path: '/' }], { mode: 'memory' });
    const scope = effectScope(true);
    const events: string[] = [];

    scope.run(() => {
      store.$subscribe(() => events.push('store'));
      router.subscribe(() => events.push('route'));
    });

    store.$patch({ count: 1 });
    await router.start();
    await router.navigate('/');
    scope.dispose();
    store.$patch({ count: 2 });
    await router.navigate('/');

    expect(events).toEqual(['store', 'route', 'route']);
    expect(getActiveScopeDiagnostics().some((item) => item.id === (scope as any).id)).toBe(false);
  });
});
