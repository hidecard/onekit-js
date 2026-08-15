import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const exists = async (target) => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

const packageNameFromPath = (appPath) => {
  const name = path.basename(appPath);
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new Error('Application name may contain only letters, numbers, dots, hyphens, and underscores.');
  }
  return name.toLowerCase();
};

const tsMain = () => `import { create, mount, register } from 'onekit-js';
import App from './App.okjs';
import './style.css';

register('App', App);
const instance = create('App');
if (!instance) throw new Error('App component could not be created');
mount(instance, '#app');
`;

const jsMain = tsMain;

const style = `:root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #172033; background: #eef2ff; }
body { display: grid; min-height: 100vh; margin: 0; place-items: center; }
.card { width: min(90vw, 34rem); padding: 3rem; text-align: center; background: white; border-radius: 20px; box-shadow: 0 20px 50px rgb(0 0 0 / 10%); }
button { padding: .7rem 1rem; color: white; background: #5757d5; border: 0; border-radius: 8px; cursor: pointer; }
button:hover { background: #4141b5; }
.eyebrow { color: #5757d5; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
`;

export async function createApp(appName, options = {}) {
  if (!appName || appName.startsWith('-')) throw new Error('Please provide an application name.');
  const appPath = path.resolve(appName);
  const packageName = packageNameFromPath(appPath);
  const template = options.template ?? 'ts';
  if (!['ts', 'js'].includes(template)) throw new Error(`Unknown template "${template}". Use "ts" or "js".`);
  if (await exists(appPath)) throw new Error(`Directory "${appName}" already exists`);

  await mkdir(path.join(appPath, 'src'), { recursive: true });
  await mkdir(path.join(appPath, 'tests'), { recursive: true });
  const isTypeScript = template === 'ts';
  const packageJson = {
    name: packageName,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview', test: 'node --test', ...(isTypeScript ? { 'type-check': 'tsc --noEmit' } : {}) },
    dependencies: { 'onekit-js': '^3.1.13' },
    devDependencies: { vite: '^7.2.6', ...(isTypeScript ? { typescript: '^5.9.3' } : {}) }
  };

  await writeFile(path.join(appPath, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
    await writeFile(path.join(appPath, 'vite.config.ts'), `import { defineConfig } from 'vite';
import { oneKitVitePlugin } from 'onekit-js/vite';

export default defineConfig({
  plugins: [oneKitVitePlugin()],
  server: { allowedHosts: true }
});
`);
  await writeFile(path.join(appPath, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${packageName}</title></head>
<body><main id="app"></main><script type="module" src="/src/main.${isTypeScript ? 'ts' : 'js'}"></script></body></html>\n`);
  await writeFile(path.join(appPath, 'src', `main.${isTypeScript ? 'ts' : 'js'}`), isTypeScript ? tsMain() : jsMain());
  await writeFile(path.join(appPath, 'src', 'App.okjs'), `<script lang="${isTypeScript ? 'ts' : 'js'}">
export default {
  name: 'App',
  data: () => ({ count: 0 }),
  methods: {
    increment(this${isTypeScript ? ': any' : ''}) {
      this.state.count += 1;
      this.update();
    },
  },
};
</script>
<template>
  <section class="card">
    <p class="eyebrow">OneKit JS</p>
    <h1>${packageName}</h1>
    <p>Count: {{count}}</p>
    <button ok-on.click="increment()" type="button">Increment</button>
  </section>
</template>
<style scoped>
.card { width: min(90vw, 34rem); padding: 3rem; text-align: center; background: white; border-radius: 20px; box-shadow: 0 20px 50px rgb(0 0 0 / 10%); }
button { padding: .7rem 1rem; color: white; background: #5757d5; border: 0; border-radius: 8px; cursor: pointer; }
.eyebrow { color: #5757d5; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
</style>
`);
  await writeFile(path.join(appPath, 'src', 'style.css'), style);
  await writeFile(path.join(appPath, 'tests', 'smoke.test.js'), `import test from 'node:test';
import assert from 'node:assert/strict';

test('generated OneKit project has a valid package name', () => {
  assert.match(${JSON.stringify(packageName)}, /^[a-z0-9._-]+$/);
});
`);
  if (isTypeScript) {
    await writeFile(path.join(appPath, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2020', useDefineForClassFields: true, module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true, skipLibCheck: true }, include: ['src'] }, null, 2) + '\n');
  }
  await writeFile(path.join(appPath, 'README.md'), `# ${packageName}\n\nGenerated with OneKit JS.\n\n## Development\n\n~~~bash\nnpm install\nnpm run dev\n~~~\n\n## Production build\n\n~~~bash\nnpm run build\nnpm run preview\n~~~\n`);
  return { appPath, template, packageName };
}
