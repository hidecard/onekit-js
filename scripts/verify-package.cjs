#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repo = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'onekit-package-'));
const tarball = execFileSync('npm', ['pack', '--silent'], { cwd: repo, encoding: 'utf8' }).trim().split(/\r?\n/).pop();
const tarballPath = path.join(repo, tarball);

try {
  execFileSync('npm', ['init', '-y'], { cwd: temp, stdio: 'ignore' });
  execFileSync('npm', ['install', '--ignore-scripts', tarballPath], { cwd: temp, stdio: 'inherit' });

  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import * as OneKit from 'onekit-js';
    import * as SSR from 'onekit-js/ssr';
    if (typeof OneKit.reactive !== 'function') throw new Error('root reactive export missing');
    if (typeof SSR.renderToString !== 'function') throw new Error('SSR export missing');
  `], { cwd: temp, stdio: 'inherit' });

  execFileSync(process.execPath, ['-e', `
    const OneKit = require('onekit-js');
    if (typeof OneKit.reactive !== 'function') throw new Error('CJS reactive export missing');
  `], { cwd: temp, stdio: 'inherit' });

  execFileSync('node', [path.join(temp, 'node_modules', 'onekit-js', 'bin', 'onekit.js'), '--help'], {
    cwd: temp,
    stdio: 'inherit'
  });

  console.log(`Package verification passed in ${temp}`);
} finally {
  fs.rmSync(tarballPath, { force: true });
  fs.rmSync(temp, { recursive: true, force: true });
}
