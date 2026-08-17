import { createRouter, effect, effectScope, enableDevTools, measureDevTools, reactive, stop } from '../src/index';

describe('DevTools foundation', () => {
  it('is opt-in and reports reactive triggers, effect runs, and stop events', async () => {
    const state = reactive({ count: 0 });
    const before = [] as string[];
    state.count = 1;
    const bridge = enableDevTools();
    const unsubscribe = bridge.subscribe(event => before.push(event.type));
    let seen = 0;
    const runner = effect(() => { seen = state.count; });
    state.count = 2;
    await Promise.resolve();
    stop(runner);
    expect(seen).toBe(2);
    expect(before).toEqual(expect.arrayContaining(['reactive:effect', 'reactive:trigger']));
    expect(before.filter(type => type === 'reactive:effect').length).toBeGreaterThanOrEqual(2);
    unsubscribe();
    bridge.dispose();
    state.count = 3;
    expect(before.filter(type => type === 'reactive:trigger').length).toBe(1);
  });

  it('bounds history and returns detached inspection snapshots', () => {
    const bridge = enableDevTools({ historySize: 2 });
    const state = reactive({ count: 0 });
    state.count = 1;
    state.count = 2;
    state.count = 3;
    const history = bridge.getHistory();
    expect(history).toHaveLength(2);
    expect(history.every(event => event.type === 'reactive:trigger')).toBe(true);
    expect(bridge.getMetadata()).toMatchObject({ enabled: true, historySize: 2, eventCount: 2 });
    bridge.clearHistory();
    expect(bridge.getHistory()).toEqual([]);
    bridge.dispose();
  });

  it('installs globals only in browser environments and cleans them up', () => {
    const bridge = enableDevTools({ installGlobal: true, globalName: '__ONEKIT_TEST_DEVTOOLS__' });
    if (typeof window !== 'undefined') {
      expect((window as unknown as Record<string, unknown>).__ONEKIT_TEST_DEVTOOLS__).toBe(bridge);
    } else {
      expect((globalThis as Record<string, unknown>).__ONEKIT_TEST_DEVTOOLS__).toBeUndefined();
    }
    bridge.dispose();
    if (typeof window !== 'undefined') {
      expect((window as unknown as Record<string, unknown>).__ONEKIT_TEST_DEVTOOLS__).toBeUndefined();
    }
  });

  it('records synchronous and asynchronous profiling results without changing task behavior', async () => {
    const bridge = enableDevTools();
    const events: Array<{ name: string; status: string; duration: number }> = [];
    const unsubscribe = bridge.subscribe(event => {
      if (event.type === 'performance:measure') events.push(event);
    });

    expect(measureDevTools('sync-work', () => 42)).toBe(42);
    await expect(bridge.measure('async-work', async () => 'ready')).resolves.toBe('ready');
    expect(events).toHaveLength(2);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'sync-work', status: 'success' }),
      expect.objectContaining({ name: 'async-work', status: 'success' }),
    ]));
    expect(events.every(event => event.duration >= 0)).toBe(true);

    expect(() => bridge.measure('failed-work', () => { throw new Error('failed'); })).toThrow('failed');
    expect(events).toContainEqual(expect.objectContaining({ name: 'failed-work', status: 'error' }));
    unsubscribe();
    bridge.dispose();
  });

  it('reports router navigation lifecycle and can be disposed', async () => {
    const events: string[] = [];
    const bridge = enableDevTools();
    const unsubscribe = bridge.subscribe(event => {
      if (event.type === 'router:navigation') events.push(event.phase);
    });
    const router = createRouter([
      { path: '/', handler: () => undefined },
      { path: '/about', handler: () => undefined }
    ], { mode: 'memory', initialPath: '/' });
    await router.start();
    await router.navigate('/about');
    expect(events).toEqual(['start', 'success', 'start', 'success']);
    unsubscribe();
    bridge.dispose();
    await router.navigate('/');
    expect(events).toEqual(['start', 'success', 'start', 'success']);
  });
});


describe('DevTools live inspectors', () => {
  it('exposes registered inspector snapshots and lifecycle events', () => {
    const events: string[] = [];
    const bridge = enableDevTools();
    const unsubscribe = bridge.subscribe((event) => events.push(event.type));
    const scope = effectScope(true);
    scope.run(() => {
      const state = reactive({ ready: true });
      effect(() => state.ready);
    });

    expect(bridge.getInspectors()).toEqual(expect.objectContaining({
      components: expect.any(Array),
      stores: expect.any(Array),
    }));
    expect(events).toContain('scope:lifecycle');
    expect(bridge.getResourceGraph()).toEqual(expect.arrayContaining([
      expect.objectContaining({ resourceType: 'effect', ownerId: expect.any(Number) }),
    ]));
    expect(bridge.getDependencyGraph()).toEqual(expect.arrayContaining([
      expect.objectContaining({ effectId: expect.any(Number), targetId: expect.any(Number), key: 'ready' }),
    ]));

    scope.dispose();
    expect(bridge.getResourceGraph()).toEqual([]);
    expect(events).toContain('resource:lifecycle');
    unsubscribe();
    bridge.dispose();
  });
});
