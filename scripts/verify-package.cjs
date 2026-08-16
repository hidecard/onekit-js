#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repo = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'onekit-package-'));
// Build generated library and Vite subpath artifacts before packing. This keeps
// clean CI checkouts equivalent to local release builds.
execFileSync('npm', ['run', 'build'], { cwd: repo, stdio: 'inherit' });
const tarball = execFileSync('npm', ['pack', '--silent'], { cwd: repo, encoding: 'utf8' }).trim().split(/\r?\n/).pop();
const tarballPath = path.join(repo, tarball);

try {
  execFileSync('npm', ['init', '-y'], { cwd: temp, stdio: 'ignore' });
  execFileSync('npm', ['install', '--ignore-scripts', tarballPath], { cwd: temp, stdio: 'inherit' });

  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import * as OneKit from 'onekit-js';
    import * as SSR from 'onekit-js/ssr';
    import * as API from 'onekit-js/api';
    import * as Storage from 'onekit-js/storage';
    import * as A11y from 'onekit-js/a11y';
    import * as Ergonomics from 'onekit-js/ergonomics';
    import * as WebComponents from 'onekit-js/web-components';
    import * as Vite from 'onekit-js/vite';
    if (typeof OneKit.reactive !== 'function') throw new Error('root reactive export missing');
    if (typeof SSR.renderToString !== 'function') throw new Error('SSR export missing');
    if (typeof API.request !== 'function') throw new Error('API subpath export missing');
    if (typeof Storage.createStorage !== 'function') throw new Error('Storage subpath export missing');
    if (typeof A11y.announce !== 'function') throw new Error('A11y subpath export missing');
    if (typeof Ergonomics.state !== 'function') throw new Error('Ergonomics subpath export missing');
    if (typeof WebComponents.registerWebComponent !== 'function') throw new Error('Web-components subpath export missing');
    if (typeof Vite.oneKitVitePlugin !== 'function') throw new Error('Vite plugin export missing');
    if (typeof Vite.preserveHMRState !== 'function') throw new Error('HMR state helper missing');
  `], { cwd: temp, stdio: 'inherit' });

  execFileSync(process.execPath, ['-e', `
    const OneKit = require('onekit-js');
    const CJSApi = require('onekit-js/api');
    const CJSStorage = require('onekit-js/storage');
    const CJSErgonomics = require('onekit-js/ergonomics');
    if (typeof OneKit.reactive !== 'function') throw new Error('CJS reactive export missing');
    if (typeof CJSApi.request !== 'function') throw new Error('CJS API subpath export missing');
    if (typeof CJSStorage.createStorage !== 'function') throw new Error('CJS storage subpath export missing');
    if (typeof CJSErgonomics.state !== 'function') throw new Error('CJS ergonomics subpath export missing');
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
