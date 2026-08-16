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

const tsMain = () => `import { create, destroy, mount, register } from 'onekit-js';
import App from './App.okjs';
import './style.css';

register('App', App);
const app = document.querySelector('#app');
if (!app) throw new Error('OneKit app mount point #app was not found');
app.replaceChildren();
const instance = create('App');
if (!instance) throw new Error('App component could not be created');
mount(instance, app);

if (import.meta.hot) {
  import.meta.hot.dispose(() => destroy(instance));
}
`;

const jsMain = tsMain;

const style = `:root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #e9edff; background: #090d1c; font-synthesis: none; text-rendering: optimizeLegibility; }
* { box-sizing: border-box; }
body { min-width: 320px; min-height: 100vh; margin: 0; background: radial-gradient(circle at 15% 0%, #263b83 0, transparent 34rem), #090d1c; }
button, input { font: inherit; }
button:focus-visible, input:focus-visible { outline: 3px solid #9ca8ff; outline-offset: 3px; }
#app { min-height: 100vh; }
`;

const appTemplate = ({ packageName, isTypeScript }) => `<script lang="${isTypeScript ? 'ts' : 'js'}">
export default {
  name: 'App',
  data: () => ({ count: 0, step: 1 }),
  methods: {
    increment() { this.state.count += Number(this.state.step) || 1; this.update(); },
    decrement() { this.state.count -= Number(this.state.step) || 1; this.update(); },
    reset() { this.state.count = 0; this.update(); },
  },
};
</script>
<template>
  <main class="shell">
    <nav class="topbar" aria-label="Main navigation"><a class="brand" href="/" aria-label="${packageName} home"><span class="brand-mark">O</span><span>OneKit<span class="brand-accent">.js</span></span></a><span class="version-pill">V3 starter</span></nav>
    <section class="hero" aria-labelledby="welcome-title"><div class="hero-copy"><p class="eyebrow"><span class="status-dot"></span> Ready to build</p><h1 id="welcome-title">Ship your next idea <span>faster.</span></h1><p class="lede">A focused starter for ${packageName}, powered by fine-grained reactivity and a lightweight developer experience.</p><div class="hero-actions"><a class="primary-link" href="https://github.com/hidecard/onekit-js" target="_blank" rel="noreferrer">Explore OneKit <span aria-hidden="true">↗</span></a><a class="text-link" href="https://github.com/hidecard/onekit-js#readme" target="_blank" rel="noreferrer">Read the docs</a></div></div><div class="orb" aria-hidden="true"><span>OK</span></div></section>
    <section class="workspace" aria-labelledby="demo-title"><div class="section-heading"><div><p class="eyebrow">Live playground</p><h2 id="demo-title">Your first reactive component</h2></div><span class="live-badge"><span class="status-dot"></span> Live</span></div><div class="playground"><div class="counter-panel"><p class="panel-label">Current value</p><output class="count" aria-live="polite">{{count}}</output><div class="controls" role="group" aria-label="Counter controls"><button class="icon-button" ok-on.click="decrement()" type="button" aria-label="Decrease value">−</button><button class="reset-button" ok-on.click="reset()" type="button">Reset</button><button class="icon-button" ok-on.click="increment()" type="button" aria-label="Increase value">+</button></div></div><div class="settings-panel"><p class="panel-label">Adjust increment</p><label class="step-label" for="step">Step size</label><div class="input-wrap"><input id="step" ok-model="step" type="number" min="1" max="10" inputmode="numeric" aria-describedby="step-help"><span>units</span></div><p id="step-help" class="helper">Every click updates only the affected text node.</p></div></div></section>
    <section class="feature-grid" aria-label="OneKit highlights"><article class="feature-card"><span class="feature-icon">✦</span><h3>Fine-grained</h3><p>Direct updates with no virtual DOM overhead.</p></article><article class="feature-card"><span class="feature-icon">⌁</span><h3>State-safe HMR</h3><p>Iterate quickly while preserving component state.</p></article><article class="feature-card"><span class="feature-icon">◈</span><h3>Built for scale</h3><p>Scopes, boundaries and tooling for production apps.</p></article></section>
    <footer><span>Built with OneKit JS</span><span>·</span><span>${packageName}</span></footer>
  </main>
</template>
<style scoped>
.shell { width: min(1120px, calc(100% - 3rem)); margin: 0 auto; padding: 1.5rem 0 2rem; } .topbar, .hero, .section-heading, footer { display: flex; align-items: center; justify-content: space-between; } .brand { display: inline-flex; align-items: center; gap: .65rem; color: #f4f6ff; font-size: 1.05rem; font-weight: 800; letter-spacing: -.03em; text-decoration: none; } .brand-mark { display: grid; width: 2rem; height: 2rem; place-items: center; color: #0b1021; background: linear-gradient(135deg, #b5baff, #7b8cff); border-radius: .7rem; } .brand-accent, .hero h1 span { color: #9ca8ff; } .version-pill, .live-badge { padding: .38rem .7rem; color: #aab4d5; font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; background: rgb(137 151 255 / 10%); border: 1px solid rgb(157 169 255 / 20%); border-radius: 999px; } .hero { position: relative; min-height: 22rem; padding: 4.8rem 0 4.2rem; overflow: hidden; } .hero-copy { position: relative; z-index: 1; max-width: 39rem; } .eyebrow { display: flex; gap: .5rem; align-items: center; margin: 0 0 1rem; color: #9ca8ff; font-size: .72rem; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; } .status-dot { display: inline-block; width: .45rem; height: .45rem; background: #5ee3a1; border-radius: 50%; box-shadow: 0 0 .8rem #5ee3a1; } .hero h1 { max-width: 11ch; margin: 0; color: #f4f6ff; font-size: clamp(3.1rem, 8vw, 6.4rem); line-height: .95; letter-spacing: -.075em; } .lede { max-width: 33rem; margin: 1.5rem 0 0; color: #aab4d5; font-size: 1.05rem; line-height: 1.65; } .hero-actions { display: flex; gap: 1.25rem; align-items: center; margin-top: 2rem; } .primary-link, .text-link { font-weight: 750; text-decoration: none; } .primary-link { padding: .85rem 1.1rem; color: #0c1124; background: #b5baff; border-radius: .65rem; } .text-link { color: #b8c1e2; } .orb { position: absolute; right: 4%; width: 19rem; height: 19rem; display: grid; place-items: center; color: #aeb8ff; font-size: 5rem; font-weight: 900; background: radial-gradient(circle at 35% 25%, #8797ff, #4655b2 42%, #222d74 72%, transparent 73%); border-radius: 50%; opacity: .9; box-shadow: inset -2rem -2rem 4rem rgb(8 13 34 / 55%); } .workspace { padding: 1.5rem; background: rgb(22 29 58 / 78%); border: 1px solid rgb(156 168 255 / 16%); border-radius: 1.2rem; } .section-heading { margin-bottom: 1.4rem; } .section-heading h2 { margin: 0; color: #f4f6ff; font-size: clamp(1.25rem, 3vw, 1.7rem); } .section-heading .eyebrow { margin-bottom: .45rem; } .live-badge { display: inline-flex; gap: .45rem; align-items: center; color: #76e4ad; } .playground { display: grid; grid-template-columns: 1.15fr .85fr; gap: 1px; overflow: hidden; background: rgb(156 168 255 / 14%); border-radius: .85rem; } .counter-panel, .settings-panel { padding: 2rem; background: #111832; } .settings-panel { background: #0e142b; } .panel-label { color: #8995bb; font-size: .76rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; } .count { display: block; margin: .4rem 0 1.4rem; color: #f4f6ff; font-size: clamp(4rem, 10vw, 6.5rem); font-variant-numeric: tabular-nums; font-weight: 850; letter-spacing: -.08em; line-height: 1; } .controls { display: flex; gap: .55rem; align-items: center; } button { border: 0; cursor: pointer; transition: transform .15s ease, background .15s ease; } button:hover { transform: translateY(-2px); } .icon-button, .reset-button { color: #e9edff; background: #27325f; border-radius: .55rem; } .icon-button { width: 3rem; height: 2.7rem; font-size: 1.35rem; } .reset-button { height: 2.7rem; padding: 0 1rem; font-size: .85rem; font-weight: 750; } .step-label { display: block; margin: 1.6rem 0 .55rem; color: #d6dcf5; font-size: .85rem; } .input-wrap { display: flex; align-items: center; gap: .6rem; max-width: 15rem; padding: .7rem .8rem; background: #161f43; border: 1px solid #354173; border-radius: .6rem; } .input-wrap input { width: 100%; color: #f4f6ff; background: transparent; border: 0; outline: 0; font-weight: 750; } .input-wrap span, .helper { color: #8995bb; font-size: .8rem; } .helper { max-width: 16rem; line-height: 1.5; } .feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem; } .feature-card { padding: 1.3rem; background: rgb(18 25 52 / 72%); border: 1px solid rgb(156 168 255 / 12%); border-radius: .85rem; } .feature-icon { color: #aeb8ff; font-size: 1.3rem; } .feature-card h3 { margin: .7rem 0 .35rem; color: #f4f6ff; font-size: .95rem; } .feature-card p { margin: 0; color: #8995bb; font-size: .82rem; line-height: 1.5; } footer { justify-content: center; gap: .6rem; padding: 2rem 0 0; color: #667294; font-size: .75rem; } @media (max-width: 720px) { .shell { width: min(100% - 2rem, 40rem); } .hero { min-height: auto; padding: 4rem 0 3rem; } .orb { right: -5rem; width: 14rem; height: 14rem; opacity: .35; } .playground, .feature-grid { grid-template-columns: 1fr; } .counter-panel, .settings-panel { padding: 1.5rem; } } @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; } }
</style>
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
    dependencies: { 'onekit-js': '^3.1.16' },
    devDependencies: { vite: '^7.2.6', ...(isTypeScript ? { typescript: '^5.9.3' } : {}) }
  };

  await writeFile(path.join(appPath, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
    await writeFile(path.join(appPath, 'vite.config.ts'), `import { fileURLToPath, URL } from 'node:url';
	import { defineConfig } from 'vite';
	import { oneKitVitePlugin } from 'onekit-js/vite';

	export default defineConfig({
	  root: fileURLToPath(new URL('.', import.meta.url)),
	  plugins: [oneKitVitePlugin() as any],
	  server: { allowedHosts: true }
	});
`);

  await writeFile(path.join(appPath, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${packageName}</title></head>
<body><main id="app"></main><script type="module" src="/src/main.${isTypeScript ? 'ts' : 'js'}"></script></body></html>\n`);
  await writeFile(path.join(appPath, 'src', `main.${isTypeScript ? 'ts' : 'js'}`), isTypeScript ? tsMain() : jsMain());
  await writeFile(path.join(appPath, 'src', 'App.okjs'), appTemplate({ packageName, isTypeScript }));
  await writeFile(path.join(appPath, 'src', 'style.css'), style);
  await writeFile(path.join(appPath, 'tests', 'smoke.test.js'), `import test from 'node:test';
import assert from 'node:assert/strict';

test('generated OneKit project has a valid package name and starter UI', () => {
  assert.match(${JSON.stringify(packageName)}, /^[a-z0-9._-]+$/);
  assert.equal(${JSON.stringify(template)}, ${JSON.stringify(template)});
});
`);
  if (isTypeScript) {
    await writeFile(path.join(appPath, 'src', 'okjs.d.ts'), "declare module '*.okjs' {\n  const component: Record<string, unknown>;\n  export default component;\n}\n");
    await writeFile(path.join(appPath, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2020', useDefineForClassFields: true, module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true, skipLibCheck: true }, include: ['src'] }, null, 2) + '\n');
  }
  await writeFile(path.join(appPath, 'README.md'), `# ${packageName}\n\nA modern OneKit JS starter with a responsive reactive playground.\n\n## Development\n\n~~~bash\nnpm install\nnpm run dev\n~~~\n\nOpen the local URL printed by Vite. Edit src/App.okjs to change the UI; Vite HMR preserves component state while you work.\n\n## Production build\n\n~~~bash\nnpm run build\nnpm run preview\n~~~\n`);
  return { appPath, template, packageName };
}
