import { createRouter } from '../src/index';
import { createErrorBoundary, createHeadManager, createLoadingBoundary, createQueryClient, createRouteManifest } from '../src/index';
describe('M2 router production contract', () => {

  it('prefetches route data without committing navigation state', async () => {
    const router = createRouter([
      { path: '/', handler: jest.fn() },
      { path: '/docs/:id', loader: ({ to }) => ({ id: to.params.id }) },
    ], { mode: 'memory', initialPath: '/' });
    await router.start();
    const listener = jest.fn();
    router.subscribe(listener);

    const result = await router.prefetch('/docs/42');

    expect(result?.data).toEqual({ id: '42' });
    expect(router.getCurrentPath()).toBe('/');
    expect(listener).not.toHaveBeenCalled();
  });
  it('creates a JSON-safe manifest for nested routes and excludes dynamic query keys', () => {
    const loader = () => ({ ready: true });
    const lazy = async () => ({ default: 'ReportsPage' });
    const manifest = createRouteManifest([{
      path: '/app',
      meta: { shell: 'dashboard' },
      children: [{ path: '/reports/:id', loader, lazy, queryKey: ({ to }) => ['report', to.params.id] }],
    }]);

    expect(manifest).toEqual({
      version: 1,
      routes: [
        { path: '/app', hasLoader: false, hasLazyComponent: false, meta: { shell: 'dashboard' } },
        { path: '/app/reports/:id', parentPath: '/app', hasLoader: true, hasLazyComponent: true },
      ],
    });
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);
  });

  it('composes parent and leaf route metadata after navigation commits', async () => {
    const head = createHeadManager();
    const router = createRouter([{
      path: '/app',
      head: { title: 'App', openGraph: { siteName: 'OneKit' } },
      children: [{
        path: '/dashboard',
        head: { title: 'Dashboard', description: 'Reports', openGraph: { title: 'Dashboard' } },
      }],
    }], { mode: 'memory', head });

    await router.navigate('/app/dashboard');

    expect(head.get()).toMatchObject({ title: 'Dashboard', description: 'Reports' });
    expect(head.get().openGraph).toEqual({ siteName: 'OneKit', title: 'Dashboard' });
    head.dispose();
  });

  it('loads lazy components once and preserves matched params in loader context', async () => {
    const lazy = jest.fn(async () => ({ default: 'DocsPage' }));
    const router = createRouter([{
      path: '/docs/:id',
      lazy,
      loader: ({ to }) => ({ id: to.params.id }),
    }], { mode: 'memory' });

    const first = await router.navigate('/docs/7');
    const second = await router.navigate('/docs/8');

    expect(first?.route.component).toBe('DocsPage');
    expect(first?.data).toEqual({ id: '7' });
    expect(second?.data).toEqual({ id: '8' });
    expect(lazy).toHaveBeenCalledTimes(1);
  });

  it('runs scroll behavior after a successful navigation', async () => {
    const scroll = jest.fn();
    const router = createRouter([{ path: '/next' }], { mode: 'memory', scrollBehavior: scroll });
    await router.navigate('/next');
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ path: '/next' }), null);
  });

  it('exposes parent-to-leaf matched records and composes nested layout components', async () => {
    const order: string[] = [];
    const router = createRouter([{
      path: '/app/:tenant',
      component: 'AppLayout',
      beforeEnter: ({ to, matched }) => { order.push(`guard:${to.params.tenant}:${matched?.length}`); },
      loader: ({ to }) => { order.push(`load-parent:${to.params.tenant}`); return { tenant: to.params.tenant }; },
      children: [{
        path: '/users/:id',
        component: 'UserPage',
        beforeEnter: ({ to }) => { order.push(`guard-child:${to.params.id}`); },
        loader: ({ to }) => { order.push(`load-child:${to.params.id}`); return { id: to.params.id }; },
      }],
    }], { mode: 'memory' });

    const result = await router.navigate('/app/acme/users/42');

    expect(result?.matched?.map(match => match.route.path)).toEqual(['/app/:tenant', '/users/:id']);
    expect(result?.location.params).toEqual({ tenant: 'acme', id: '42' });
    expect(result?.components).toEqual(['AppLayout', 'UserPage']);
    expect(result?.dataByRoute).toEqual([{ tenant: 'acme' }, { id: '42' }]);
    expect(order).toEqual(['guard:acme:2', 'guard-child:42', 'load-parent:acme', 'load-child:42']);
  });

  it('prefetches nested layout data without committing or notifying', async () => {
    const listener = jest.fn();
    const router = createRouter([{
      path: '/workspace/:workspaceId',
      component: 'WorkspaceLayout',
      loader: ({ to }) => ({ workspaceId: to.params.workspaceId }),
      children: [{ path: '/settings', component: 'SettingsPage', loader: () => ({ ready: true }) }],
    }], { mode: 'memory', initialPath: '/' });
    await router.start();
    router.subscribe(listener);

    const result = await router.prefetch('/workspace/acme/settings');

    expect(result?.dataByRoute).toEqual([{ workspaceId: 'acme' }, { ready: true }]);
    expect(result?.components).toEqual(['WorkspaceLayout', 'SettingsPage']);
    expect(router.getCurrentPath()).toBe('/');
    expect(listener).not.toHaveBeenCalled();
  });

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

  it('passes application context to guards and loaders and preserves loader data', async () => {
    const context = { apiBase: 'https://api.example.test', userId: 'u-1' };
    const loader = jest.fn(async ({ to, context: services }) => ({
      id: to.params.id,
      endpoint: `${services.apiBase}/users/${services.userId}`,
    }));
    const router = createRouter([
      { path: '/users/:id', beforeEnter: ({ context: services }) => services.userId === 'u-1', loader },
    ], { mode: 'memory', context });

    const result = await router.navigate('/users/42');

    expect(result?.data).toEqual({ id: '42', endpoint: 'https://api.example.test/users/u-1' });
    expect(loader).toHaveBeenCalledTimes(1);
  });
  it('caches route loaders through an optional QueryClient and derives keys from route context', async () => {
    const queryClient = createQueryClient();
    const loader = jest.fn(async ({ to }) => ({ id: to.params.id }));
    const router = createRouter([{
      path: '/users/:id',
      loader,
      queryKey: ({ to }) => ['user', to.params.id],
      queryOptions: { staleTime: Infinity },
    }], { mode: 'memory', queryClient });

    const first = await router.navigate('/users/42');
    const second = await router.navigate('/users/42');
    const prefetched = await router.prefetch('/users/42');

    expect(first?.data).toEqual({ id: '42' });
    expect(second?.data).toEqual({ id: '42' });
    expect(prefetched?.data).toEqual({ id: '42' });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('tracks route loader pending state with an optional loading boundary', async () => {
    let release!: (value: { ready: boolean }) => void;
    const loading = createLoadingBoundary<unknown>();
    const router = createRouter([{ path: '/reports', loader: () => new Promise(resolve => { release = resolve; }) }], {
      mode: 'memory',
      loadingBoundary: loading,
    });

    const navigation = router.navigate('/reports');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(loading.state.pending).toBe(true);
    release({ ready: true });
    expect((await navigation)?.data).toEqual({ ready: true });
    expect(loading.state.pending).toBe(false);
    expect(loading.render({ loading: true }, { ready: false })).toEqual({ ready: true });
  });

  it('uses an error boundary fallback for failed route loaders', async () => {
    const boundary = createErrorBoundary({
      fallback: () => ({ fallback: true }),
    });
    const router = createRouter([{
      path: '/unstable',
      loader: async () => { throw new Error('loader failed'); },
    }], { mode: 'memory', errorBoundary: boundary });

    const result = await router.navigate('/unstable');
    expect(result?.data).toEqual({ fallback: true });
    expect(boundary.state.error?.message).toBe('loader failed');
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

  it('inherits parent params for nested routes', async () => {
    const router = createRouter([{
      path: '/teams/:teamId',
      children: [{ path: '/members/:memberId' }],
    }], { mode: 'memory' });

    const result = await router.navigate('/teams/alpha/members/42');

    expect(result?.route.path).toBe('/members/:memberId');
    expect(result?.location.params).toEqual({ teamId: 'alpha', memberId: '42' });
  });

  it('matches and commits routes relative to a configured base path', async () => {
    const router = createRouter([{ path: '/dashboard' }], {
      mode: 'memory',
      base: '/console',
    });

    const result = await router.navigate('/dashboard');

    expect(result?.route.path).toBe('/dashboard');
    expect(router.getCurrentPath()).toBe('/dashboard');
  });

  it('ignores stale async loaders when a newer navigation wins', async () => {
    let releaseSlow!: () => void;
    const slow = new Promise(resolve => { releaseSlow = () => resolve({ slow: true }); });
    const events: string[] = [];
    const router = createRouter([
      { path: '/slow', loader: () => slow },
      { path: '/fast' },
    ], { mode: 'memory' });
    router.subscribe(to => events.push(to.path));

    const slowNavigation = router.navigate('/slow');
    const fastNavigation = router.navigate('/fast');
    expect((await fastNavigation)?.route.path).toBe('/fast');
    releaseSlow();

    expect(await slowNavigation).toBeNull();
    expect(router.getCurrentPath()).toBe('/fast');
    expect(events).toEqual(['/fast']);
  });

  it('ignores stale post-commit handler completion', async () => {
    let releaseHandler!: () => void;
    const handlerReady = new Promise<void>(resolve => { releaseHandler = resolve; });
    const events: string[] = [];
    const router = createRouter([
      { path: '/slow', handler: () => handlerReady },
      { path: '/fast' },
    ], { mode: 'memory' });
    router.subscribe(to => events.push(to.path));

    const slowNavigation = router.navigate('/slow');
    await Promise.resolve();
    const fastNavigation = router.navigate('/fast');
    expect((await fastNavigation)?.route.path).toBe('/fast');
    releaseHandler();

    expect(await slowNavigation).toBeNull();
    expect(events).toEqual(['/fast']);
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
