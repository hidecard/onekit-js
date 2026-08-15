import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

describe('OneKit CLI', () => {
  it('creates a Vite-compatible TypeScript starter', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'onekit-cli-'));
    const appPath = path.join(root, 'starter');
    try {
      await run(process.execPath, [path.resolve('bin/onekit.js'), 'create', appPath], { cwd: process.cwd() });
      const packageJson = JSON.parse(await readFile(path.join(appPath, 'package.json'), 'utf8'));
      expect(packageJson.type).toBe('module');
      expect(packageJson.scripts.dev).toBe('vite');
      expect(await readFile(path.join(appPath, 'src', 'main.ts'), 'utf8')).toContain('reactive');
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
      expect(await readFile(path.join(appPath, 'src', 'main.js'), 'utf8')).toContain('reactive');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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
