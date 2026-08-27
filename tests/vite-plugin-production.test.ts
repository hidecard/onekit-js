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

    expect(generated?.code).toContain('fileRouteManifest');
    expect(generated?.code).toContain('"/docs/*?"');
    expect(generated?.code).toContain('"/dashboard"');
    expect(generated?.code).toContain('export default routes');
  });

  it('rejects client modules that statically import server modules', () => {
    const plugin = oneKitVitePlugin({ componentBoundary: true });
    plugin.transform?.('"use client"; export {}', '/app/client.ts');
    plugin.transform?.('"use server"; export {}', '/app/server.ts');
    plugin.moduleParsed?.({ id: '/app/client.ts', importedModules: [{ id: '/app/server.ts' }] });

    expect(() => plugin.buildEnd?.()).toThrow(/client module .* statically imports server module/);
  });

  it('allows server modules to import client boundaries', () => {
    const plugin = oneKitVitePlugin({ componentBoundary: true });
    plugin.transform?.('"use server"; export {}', '/app/server.ts');
    plugin.transform?.('"use client"; export {}', '/app/client.ts');
    plugin.moduleParsed?.({ id: '/app/server.ts', importedModules: [{ id: '/app/client.ts' }] });

    expect(() => plugin.buildEnd?.()).not.toThrow();
  });
});
