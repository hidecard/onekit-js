import { mkdir, access, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { rollup } from 'rollup';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

const exists = async target => {
  try { await access(target); return true; } catch { return false; }
};
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const runProjectBuild = cwd => new Promise((resolve, reject) => {
  const child = spawn(npmCommand, ['run', 'build'], { cwd, stdio: 'inherit', shell: false, windowsHide: false });
  child.once('error', () => reject(Object.assign(new Error('Unable to start the project build script.'), { exitCode: 1 })));
  child.once('exit', (code, signal) => {
    if (signal) return reject(Object.assign(new Error(`Project build stopped by ${signal}.`), { exitCode: 1 }));
    if ((code ?? 1) !== 0) return reject(Object.assign(new Error(`Project build failed with exit code ${code ?? 1}.`), { exitCode: code ?? 1 }));
    resolve();
  });
});

export async function build(options = {}) {
  const { output = 'dist', minify = true } = options;
  const outputDir = path.resolve(output);
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!await exists(packagePath)) throw new Error('package.json not found. Run this command inside a project.');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  const entryPoint = pkg.source || (await exists(path.resolve(process.cwd(), 'src/index.ts')) ? 'src/index.ts' : 'src/index.js');
  const entryPath = path.resolve(process.cwd(), entryPoint);
  if (!await exists(entryPath)) {
    if (pkg.scripts?.build) {
      console.log('No library entrypoint found; delegating to the project build script.');
      await runProjectBuild(process.cwd());
      return;
    }
    throw new Error(`Entry point "${entryPoint}" not found.`);
  }

  await mkdir(outputDir, { recursive: true });
  const bundle = await rollup({ input: entryPath, plugins: [nodeResolve({ browser: true }), commonjs(), typescript({ tsconfig: false, exclude: ['tests/**', 'examples/**', 'dist/**'], compilerOptions: { target: 'ES2020', module: 'ESNext', sourceMap: true, declaration: false, declarationMap: false, noEmitOnError: false } })] });
  const base = pkg.name.replace(/[^a-zA-Z0-9_-]/g, '-');
  const outputs = [
    { file: path.join(outputDir, `${base}.esm.js`), format: 'es', sourcemap: true },
    { file: path.join(outputDir, `${base}.cjs`), format: 'cjs', sourcemap: true },
    { file: path.join(outputDir, `${base}.js`), format: 'iife', name: 'OneKitApp', sourcemap: true }
  ];
  if (minify) outputs.push(
    { file: path.join(outputDir, `${base}.esm.min.js`), format: 'es', sourcemap: true, plugins: [terser()] },
    { file: path.join(outputDir, `${base}.min.js`), format: 'iife', name: 'OneKitApp', sourcemap: true, plugins: [terser()] }
  );
  for (const outputOptions of outputs) await bundle.write(outputOptions);
  await bundle.close();
  await writeFile(path.join(outputDir, 'package.json'), JSON.stringify({ ...pkg, main: `${base}.cjs`, module: `${base}.esm.js`, browser: `${base}.js`, scripts: undefined, devDependencies: undefined }, null, 2) + '\n');
  if (await exists(path.join(process.cwd(), 'README.md'))) await copyFile(path.join(process.cwd(), 'README.md'), path.join(outputDir, 'README.md'));
  console.log(`Build completed successfully: ${outputDir}`);
}
