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
});
