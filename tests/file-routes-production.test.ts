import {
  createFileRoutes,
  defineLayoutRoute,
  defineRoute,
  filePathToRoutePath,
  routeHref,
  type RouteParamsFor,
} from '../src';

describe('file route helpers', () => {
  it('converts common file names into route paths', () => {
    expect(filePathToRoutePath('/src/pages/index.tsx', '/src/pages')).toBe('/');
    expect(filePathToRoutePath('/src/pages/users/[id].tsx', '/src/pages')).toBe('/users/:id');
    expect(filePathToRoutePath('/src/pages/docs/[...slug].tsx', '/src/pages')).toBe('/docs/*');
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
});
