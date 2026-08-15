import { createRouter } from '../src/index';

describe('M2 router production contract', () => {
  it('matches dynamic params and query values', async () => {
    const router = createRouter([{ path: '/users/:id' }], { mode: 'memory' });
    const result = await router.navigate('/users/42?tab=posts&tag=a&tag=b');

    expect(result?.location.params).toEqual({ id: '42' });
    expect(result?.location.query).toEqual({ tab: 'posts', tag: ['a', 'b'] });
  });

  it('runs guards and can cancel navigation', async () => {
    const router = createRouter([{ path: '/private', beforeEnter: () => false }], { mode: 'memory' });
    const result = await router.navigate('/private');

    expect(result).toBeNull();
    expect(router.getCurrentLocation()).toBeNull();
  });

  it('runs async loaders and notifies subscribers', async () => {
    const events: string[] = [];
    const router = createRouter([{ path: '/dashboard', loader: async () => ({ ready: true }) }], { mode: 'memory' });
    const unsubscribe = router.subscribe((to, from) => events.push(`${from?.path ?? 'none'}>${to.path}`));

    const result = await router.navigate('/dashboard');
    unsubscribe();

    expect(result?.data).toEqual({ ready: true });
    expect(events).toEqual(['none>/dashboard']);
  });

  it('supports redirects from guards', async () => {
    const router = createRouter([
      { path: '/old', beforeEnter: () => '/new' },
      { path: '/new' }
    ], { mode: 'memory' });

    const result = await router.navigate('/old');
    expect(result?.route.path).toBe('/new');
    expect(router.getCurrentPath()).toBe('/new');
  });

  it('returns a configured not-found route', async () => {
    const router = createRouter([], { mode: 'memory', notFound: { path: '/404' } });
    const result = await router.navigate('/missing');
    expect(result?.route.path).toBe('/404');
  });

  it('stops notifying subscribers after unsubscribe', async () => {
    const events: string[] = [];
    const router = createRouter([{ path: '/one' }, { path: '/two' }], { mode: 'memory' });
    const unsubscribe = router.subscribe((to) => events.push(to.path));
    await router.navigate('/one');
    unsubscribe();
    await router.navigate('/two');
    expect(events).toEqual(['/one']);
  });
});
