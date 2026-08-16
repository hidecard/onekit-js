import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

async function writePackage(directory: string, packageJson: Record<string, unknown>) {
  await writeFile(path.join(directory, 'package.json'), JSON.stringify(packageJson, null, 2));
}

describe('OneKit CLI', () => {
  it('creates a Vite-compatible TypeScript starter', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'onekit-cli-'));
    const appPath = path.join(root, 'starter');
    try {
      await run(process.execPath, [path.resolve('bin/onekit.js'), 'create', appPath], { cwd: process.cwd() });
      const packageJson = JSON.parse(await readFile(path.join(appPath, 'package.json'), 'utf8'));
      expect(packageJson.type).toBe('module');
      expect(packageJson.scripts.dev).toBe('vite');
      expect(packageJson.scripts.preview).toBe('vite preview');
      expect(packageJson.scripts.test).toBe('node --test');
      expect(await readFile(path.join(appPath, 'src', 'main.ts'), 'utf8')).toContain("./App.okjs");
      expect(await readFile(path.join(appPath, 'src', 'App.okjs'), 'utf8')).toContain('<template>');
      expect(await readFile(path.join(appPath, 'src', 'App.okjs'), 'utf8')).toContain('Developed By Arkar Yan ( H!D3_C4rD )');
      expect(await readFile(path.join(appPath, 'index.html'), 'utf8')).toContain('OneKit JS V3 starter project');
      expect(await readFile(path.join(appPath, 'README.md'), 'utf8')).toContain('Developed By Arkar Yan ( H!D3_C4rD )');
      expect(await readFile(path.join(appPath, 'vite.config.ts'), 'utf8')).toContain('oneKitVitePlugin');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('creates a JavaScript starter with the explicit template option', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'onekit-cli-js-'));
    const appPath = path.join(root, 'starter-js');
    try {
      await run(process.execPath, [path.resolve('bin/onekit.js'), 'create', appPath, '--javascript'], { cwd: process.cwd() });
      const packageJson = JSON.parse(await readFile(path.join(appPath, 'package.json'), 'utf8'));
      expect(packageJson.scripts['type-check']).toBeUndefined();
      expect(await readFile(path.join(appPath, 'src', 'main.js'), 'utf8')).toContain("./App.okjs");
      expect(await readFile(path.join(appPath, 'src', 'App.okjs'), 'utf8')).toContain('lang="js"');
      expect(await readFile(path.join(appPath, 'src', 'App.okjs'), 'utf8')).toContain('Developed By Arkar Yan ( H!D3_C4rD )');
      expect(await readFile(path.join(appPath, 'README.md'), 'utf8')).toContain('Developed By Arkar Yan ( H!D3_C4rD )');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('delegates dev, preview, and test scripts with cwd and exit codes', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'onekit-cli-runners-'));
    try {
      await writePackage(root, {
        name: 'runner-fixture',
        scripts: {
          dev: 'node -e "console.log(process.argv[1])"',
          preview: 'node -e "console.log(process.argv[1])"',
          test: 'node -e "process.exit(process.argv[1] === \\"forwarded\\" ? 0 : 9)"',
        },
      });
      await mkdir(path.join(root, 'dist'), { recursive: true });
      await writeFile(path.join(root, 'dist', 'index.html'), '<main>ready</main>');
      await expect(run(process.execPath, [path.resolve('bin/onekit.js'), 'dev', '--cwd', root, '--', 'dev-forwarded'])).resolves.toBeDefined();
      await expect(run(process.execPath, [path.resolve('bin/onekit.js'), 'preview', '--cwd', root, '--', 'preview-forwarded'])).resolves.toBeDefined();
      await expect(run(process.execPath, [path.resolve('bin/onekit.js'), 'test', '--cwd', root, '--', 'forwarded'])).resolves.toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('supports inline cwd and out-dir options used by Windows shells', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'onekit-cli-inline-'));
    const output = path.join(root, 'custom-output');
    try {
      await writePackage(root, {
        name: 'inline-fixture',
        scripts: { preview: 'node -e "process.exit(process.argv[1] === \\\"inline-forwarded\\\" ? 0 : 9)"' },
      });
      await mkdir(output, { recursive: true });
      await expect(run(process.execPath, [
        path.resolve('bin/onekit.js'), 'preview', `--cwd=${root}`, `--out-dir=${output}`, '--', 'inline-forwarded',
      ])).resolves.toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns a non-zero exit code when a delegated test script fails', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'onekit-cli-failing-'));
    try {
      await writePackage(root, { name: 'failing-fixture', scripts: { test: 'node -e "process.exit(7)"' } });
      await expect(run(process.execPath, [path.resolve('bin/onekit.js'), 'test', '--cwd', root])).rejects.toMatchObject({ code: 7 });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects preview when the build output is missing', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'onekit-cli-preview-'));
    try {
      await writePackage(root, { name: 'preview-fixture', scripts: { preview: 'node -e "process.exit(0)"' } });
      await expect(run(process.execPath, [path.resolve('bin/onekit.js'), 'preview', '--cwd', root])).rejects.toMatchObject({ code: 1 });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('prints an actionable diagnostic for unknown commands', async () => {
    await expect(run(process.execPath, [path.resolve('bin/onekit.js'), 'wat'])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('[UNKNOWN_COMMAND]'),
    });
    await expect(run(process.execPath, [path.resolve('bin/onekit.js'), 'wat'])).rejects.toMatchObject({
      stderr: expect.stringContaining('onekit help'),
    });
  });

  it('rejects missing option values with a diagnostic code', async () => {
    await expect(run(process.execPath, [path.resolve('bin/onekit.js'), 'dev', '--cwd'])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('[INVALID_OPTION]'),
    });
  });

  it('rejects an existing target directory', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'onekit-cli-existing-'));
    try {
      await expect(run(process.execPath, [path.resolve('bin/onekit.js'), 'create', root], { cwd: process.cwd() })).rejects.toThrow('already exists');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
