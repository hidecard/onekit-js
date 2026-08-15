import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const exists = async (target) => {
  try { await access(target); return true; } catch { return false; }
};

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

async function readProject(cwd) {
  const packagePath = path.join(cwd, 'package.json');
  if (!await exists(packagePath)) throw new Error(`package.json not found in ${cwd}. Run this command inside a project.`);
  return JSON.parse(await readFile(packagePath, 'utf8'));
}

export async function runProjectScript(script, args = [], options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const pkg = await readProject(cwd);
  if (!pkg.scripts?.[script]) {
    throw new Error(`Project script "${script}" is not defined in package.json.`);
  }

  const child = spawn(npmCommand, ['run', script, ...(args.length ? ['--', ...args] : [])], {
    cwd,
    stdio: 'inherit',
    shell: false,
    windowsHide: false,
  });

  const forwardSigint = () => { if (!child.killed) child.kill('SIGINT'); };
  const forwardSigterm = () => { if (!child.killed) child.kill('SIGTERM'); };
  process.once('SIGINT', forwardSigint);
  process.once('SIGTERM', forwardSigterm);

  return await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      process.removeListener('SIGINT', forwardSigint);
      process.removeListener('SIGTERM', forwardSigterm);
      if (signal) resolve(1);
      else resolve(code ?? 1);
    });
  });
}

export async function runDev(args = [], options = {}) {
  return runProjectScript('dev', args, options);
}

export async function runPreview(args = [], options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const outputDir = path.join(cwd, options.output ?? 'dist');
  if (!await exists(outputDir)) {
    throw new Error(`Preview output "${path.relative(cwd, outputDir) || 'dist'}" was not found. Run "onekit build" first.`);
  }
  return runProjectScript('preview', args, { ...options, cwd });
}

export async function runTest(args = [], options = {}) {
  return runProjectScript('test', args, options);
}
