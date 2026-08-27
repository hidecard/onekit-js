import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { oneKitVitePlugin } from '../src/vite-plugin';

describe('Vite plugin production contract', () => {
  it('generates a virtual route module and deterministic manifest from project files', () => {
    const root = mkdtempSync(join(tmpdir(), 'onekit-routes-'));
    mkdirSync(join(root, 'src/app/docs/[[...slug]]'), { recursive: true });
    mkdirSync(join(root, 'src/app/dashboard'), { recursive: true });
    writeFileSync(join(root, 'src/app/page.tsx'), 'export default function Home() { return null; }');
    writeFileSync(join(root, 'src/app/docs/[[...slug]]/page.tsx'), 'export default function Docs() { return null; }');
    writeFileSync(join(root, 'src/app/dashboard/layout.tsx'), 'export default function Layout() { return null; }');

    const plugin = oneKitVitePlugin({
      fileRoutes: { root: '/src/app', includeInfrastructure: true },
    });
    plugin.configResolved?.({ root });
    const id = plugin.resolveId?.('virtual:onekit/routes');
    expect(id).toBe('\0virtual:onekit/routes');
    const generated = plugin.load?.(id!);
    const typesId = plugin.resolveId?.('virtual:onekit/routes.d.ts');
    const generatedTypes = plugin.load?.(typesId!);

    expect(generated?.code).toContain('fileRouteManifest');
    expect(generated?.code).toContain('"/docs/*?"');
    expect(generated?.code).toContain('"/dashboard"');
    expect(generated?.code).toContain('export default routes');
    expect(generatedTypes?.code).toContain('export type FileRoutePath = "/" | "/docs/*?"');
    expect(generatedTypes?.code).toContain('export type FileRouteParams');
  });

  it('rejects duplicate normalized file-route paths and exports explicit associations', () => {
    const root = mkdtempSync(join(tmpdir(), 'onekit-route-conflict-'));
    mkdirSync(join(root, 'src/app/dashboard'), { recursive: true });
    writeFileSync(join(root, 'src/app/page.tsx'), 'export default function Home() { return null; }');
    writeFileSync(join(root, 'src/app/index.ts'), 'export default function Index() { return null; }');
    writeFileSync(join(root, 'src/app/dashboard/layout.tsx'), 'export default function Layout() { return null; }');
    writeFileSync(join(root, 'src/app/dashboard/page.tsx'), 'export default function Dashboard() { return null; }');
    const plugin = oneKitVitePlugin({ fileRoutes: { root: '/src/app', includeInfrastructure: true } });
    plugin.configResolved?.({ root });
    expect(() => plugin.load?.(plugin.resolveId?.('virtual:onekit/routes')!)).toThrow(/multiple route files normalize/);

    const cleanRoot = mkdtempSync(join(tmpdir(), 'onekit-route-association-'));
    mkdirSync(join(cleanRoot, 'src/pages/account'), { recursive: true });
    writeFileSync(join(cleanRoot, 'src/pages/account/layout.tsx'), 'export default function Layout() { return null; }');
    writeFileSync(join(cleanRoot, 'src/pages/account/middleware.ts'), 'export const middleware = () => undefined;');
    writeFileSync(join(cleanRoot, 'src/pages/account/profile.tsx'), 'export default function Profile() { return null; }');
    let manifest: unknown;
    const configured = oneKitVitePlugin({ fileRoutes: { root: 'src/pages', extensions: ['tsx'], includeInfrastructure: true, onManifest: value => { manifest = value; } } });
    configured.configResolved?.({ root: cleanRoot });
    const generated = configured.load?.(configured.resolveId?.('virtual:onekit/routes')!);
    expect(generated?.code).toContain('fileRouteAssociations');
    expect(manifest).toMatchObject({ routes: [expect.objectContaining({ path: '/account/profile' })] });
  });

  it('rejects client modules that statically import server modules', () => {
    const plugin = oneKitVitePlugin({ componentBoundary: true });
    plugin.transform?.('"use client"; export {}', '/app/client.ts');
    plugin.transform?.('"use server"; export {}', '/app/server.ts');
    plugin.moduleParsed?.({ id: '/app/client.ts', importedModules: [{ id: '/app/server.ts' }] });

    expect(() => plugin.buildEnd?.()).toThrow(/client module .* statically imports server module/);
  });

  it('rejects a client module reaching server code through a shared module', () => {
    const plugin = oneKitVitePlugin({ componentBoundary: true });
    plugin.transform?.('"use client"; export {}', '/app/client.ts');
    plugin.transform?.('export {}', '/app/shared.ts');
    plugin.transform?.('"use server"; export {}', '/app/server.ts');
    plugin.moduleParsed?.({ id: '/app/client.ts', importedModules: [{ id: '/app/shared.ts' }] });
    plugin.moduleParsed?.({ id: '/app/shared.ts', importedModules: [{ id: '/app/server.ts' }] });
    expect(() => plugin.buildEnd?.()).toThrow(/reaches server module/);
  });

  it('recognizes explicit server-only markers', () => {
    const plugin = oneKitVitePlugin({ componentBoundary: true });
    plugin.transform?.('"use client"; export {}', '/app/client.ts');
    plugin.transform?.('import "server-only"; export {}', '/app/server.ts');
    plugin.moduleParsed?.({ id: '/app/client.ts', importedModules: [{ id: '/app/server.ts' }] });
    expect(() => plugin.buildEnd?.()).toThrow(/reaches server module/);
  });

  it('allows server modules to import client boundaries', () => {
    const plugin = oneKitVitePlugin({ componentBoundary: true });
    plugin.transform?.('"use server"; export {}', '/app/server.ts');
    plugin.transform?.('"use client"; export {}', '/app/client.ts');
    plugin.moduleParsed?.({ id: '/app/server.ts', importedModules: [{ id: '/app/client.ts' }] });

    expect(() => plugin.buildEnd?.()).not.toThrow();
  });
});
