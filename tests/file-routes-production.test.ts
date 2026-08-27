import {
  composeFileRouteInfrastructure,
  createFileRoutes,
  createFileRouteManifest,
  defineLayoutRoute,
  defineRoute,
  filePathToRoutePath,
  findFileRouteConflicts,
  routeHref,
  type RouteParamsFor,
} from '../src';

describe('file route helpers', () => {
  it('converts common file names into route paths', () => {
    expect(filePathToRoutePath('/src/pages/index.tsx', '/src/pages')).toBe('/');
    expect(filePathToRoutePath('/src/pages/users/[id].tsx', '/src/pages')).toBe('/users/:id');
    expect(filePathToRoutePath('/src/pages/docs/[...slug].tsx', '/src/pages')).toBe('/docs/*');
  });

  it('supports route groups and optional catch-all segments', () => {
    expect(filePathToRoutePath('/src/app/(marketing)/about/page.tsx', '/src/app')).toBe('/about');
    expect(filePathToRoutePath('/src/app/docs/[[...slug]]/page.tsx', '/src/app')).toBe('/docs/*?');
    expect(routeHref('/docs/*?', {})).toBe('/docs');
    expect(routeHref('/docs/*?', { wildcard: 'guide/getting-started' })).toBe('/docs/guide%2Fgetting-started');
  });

  it('creates sorted routes from bundler module maps', () => {
    const routes = createFileRoutes({
      '/src/pages/users/[id].tsx': { default: 'UserPage' },
      '/src/pages/index.tsx': { default: 'HomePage' },
      '/src/pages/_layout.tsx': { default: 'PrivateLayout' },
    }, { root: '/src/pages' });

    expect(routes).toEqual([
      { path: '/', component: 'HomePage' },
      { path: '/users/:id', component: 'UserPage' },
    ]);
  });

  it('creates deterministic route, layout, and middleware metadata', () => {
    const manifest = createFileRouteManifest([
      '/src/app/(marketing)/page.tsx',
      '/src/app/docs/[[...slug]]/page.tsx',
      '/src/app/dashboard/layout.tsx',
      '/src/app/middleware.ts',
    ], { root: '/src/app', includeInfrastructure: true });

    expect(manifest.version).toBe(1);
    expect(manifest.routes).toEqual([
      expect.objectContaining({ path: '/', file: '/src/app/(marketing)/page.tsx', kind: 'route' }),
      expect.objectContaining({ path: '/docs/*?', optional: true, catchAll: true }),
    ]);
    expect(manifest.layouts).toEqual([
      expect.objectContaining({ path: '/dashboard', kind: 'layout' }),
    ]);
    expect(manifest.middleware).toEqual([
      expect.objectContaining({ path: '/', kind: 'middleware' }),
    ]);
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);
  });

  it('preserves explicit route definitions and builds hrefs', () => {
    const route = defineRoute('/reports/:id', { component: 'Reports' });
    expect(route.path).toBe('/reports/:id');
    expect(createFileRoutes({ '/generated/reports.ts': route })).toEqual([route]);
    expect(routeHref(route.path, { id: 'q1/summary' })).toBe('/reports/q1%2Fsummary');
  });

  it('retains typed params and composes nested layouts', () => {
    const params: RouteParamsFor<'/users/:id'> = { id: 'u-1' };
    expect(routeHref('/users/:id', params)).toBe('/users/u-1');

    const layout = defineLayoutRoute('/dashboard', 'DashboardLayout', [
      defineRoute('/settings', { component: 'SettingsPage' }),
    ] as const);

    expect(layout.layout).toBe('DashboardLayout');
    expect(layout.children[0].path).toBe('/settings');
  });

  it('composes infrastructure explicitly without treating layouts or middleware as pages', () => {
    const modules = {
      '/src/app/layout.tsx': { default: 'RootLayout' },
      '/src/app/account/layout.tsx': { default: 'AccountLayout' },
      '/src/app/account/middleware.ts': { middleware: 'AccountMiddleware' },
      '/src/app/account/profile.tsx': { default: 'ProfilePage' },
    };
    const composed = composeFileRouteInfrastructure(modules, { root: '/src/app' });
    expect(composed).toHaveLength(1);
    expect(composed[0]).toMatchObject({
      path: '/account/profile',
      route: { path: '/account/profile', component: 'ProfilePage' },
      layouts: ['RootLayout', 'AccountLayout'],
      middleware: ['AccountMiddleware'],
    });
  });

  it('reports ambiguous dynamic route patterns as conflicts', () => {
    const manifest = createFileRouteManifest([
      '/src/app/users/[id].tsx',
      '/src/app/users/[slug].tsx',
    ], { root: '/src/app' });
    expect(findFileRouteConflicts(manifest)).toEqual([
      { path: '/users/:id', files: ['/src/app/users/[id].tsx', '/src/app/users/[slug].tsx'] },
    ]);
  });
});
