import {
  createFileRoutes,
  defineRoute,
  filePathToRoutePath,
  routeHref,
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
});
