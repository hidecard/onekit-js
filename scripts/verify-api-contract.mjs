#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = path.join(repo, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const requireFromRepo = createRequire(import.meta.url);

const entries = Object.entries(pkg.exports ?? {})
  .filter(([name]) => name !== './package.json' && name !== './cli/create')
  .map(([name, target]) => ({ name, target }));

if (!entries.length) {
  throw new Error('No runtime package exports were found');
}

const resolveTarget = (target) => {
  if (typeof target === 'string') return target;
  return target.import ?? target.require ?? target.default;
};

const report = [];
for (const entry of entries) {
  const target = resolveTarget(entry.target);
  if (!target || typeof target !== 'string') {
    throw new Error(`Export ${entry.name} has no runtime target`);
  }

  const targetPath = path.resolve(repo, target);
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Export ${entry.name} target does not exist: ${target}`);
  }

  const specifier = entry.name === '.' ? pkg.name : `${pkg.name}/${entry.name.slice(2)}`;
  const imported = await import(specifier);
  if (!imported || typeof imported !== 'object') {
    throw new Error(`ESM export ${specifier} did not return a module namespace`);
  }

  let cjs = null;
  try {
    cjs = requireFromRepo(specifier);
  } catch (error) {
    throw new Error(`CJS export ${specifier} failed: ${error.message}`);
  }
  if (!cjs || (typeof cjs !== 'object' && typeof cjs !== 'function')) {
    throw new Error(`CJS export ${specifier} did not return a module value`);
  }

  report.push({ subpath: entry.name, target, esm: true, cjs: true });
}

const output = {
  package: pkg.name,
  version: pkg.version,
  checkedAt: new Date().toISOString(),
  entries: report,
};

if (process.env.ONEKIT_API_CONTRACT_REPORT) {
  fs.mkdirSync(path.dirname(path.resolve(process.env.ONEKIT_API_CONTRACT_REPORT)), { recursive: true });
  fs.writeFileSync(path.resolve(process.env.ONEKIT_API_CONTRACT_REPORT), `${JSON.stringify(output, null, 2)}\n`);
}

console.log(`API contract passed: ${pkg.name}@${pkg.version}; ${report.length} ESM/CJS runtime exports verified.`);
