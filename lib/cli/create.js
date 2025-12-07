import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp(appName) {
  const appPath = path.resolve(appName);

  // Check if directory already exists
  if (await fs.pathExists(appPath)) {
    throw new Error(`Directory "${appName}" already exists`);
  }

  // Create app directory
  await fs.ensureDir(appPath);

  // Create package.json
  const packageJson = {
    name: appName,
    version: '1.0.0',
    description: 'A OneKit JS application',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview'
    },
    devDependencies: {
      vite: '^4.0.0',
      'onekit-js': '^3.1.7'
    }
  };

  await fs.writeJson(path.join(appPath, 'package.json'), packageJson, { spaces: 2 });

  // Create index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`;

  await fs.writeFile(path.join(appPath, 'index.html'), indexHtml);

  // Create src directory and main.js
  await fs.ensureDir(path.join(appPath, 'src'));

  const mainJs = `import { ok, reactive, watch } from 'onekit-js';

const state = reactive({
  title: 'Welcome to ${appName}',
  count: 0
});

watch(state, 'count', (newCount) => {
  ok('#counter').text(newCount);
});

ok('#app').html(\`
  <div class="app">
    <h1>{{title}}</h1>
    <div class="counter">
      <button id="decrement">-</button>
      <span id="counter">{{count}}</span>
      <button id="increment">+</button>
    </div>
  </div>
\`);

// Bind events
ok('#increment').click(() => state.count++);
ok('#decrement').click(() => state.count--);

// Update template
function updateView() {
  ok('#app h1').text(state.title);
  ok('#counter').text(state.count);
}

updateView();`;

  await fs.writeFile(path.join(appPath, 'src', 'main.js'), mainJs);

  // Create vite.config.js
  const viteConfig = `import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true
  }
});`;

  await fs.writeFile(path.join(appPath, 'vite.config.js'), viteConfig);

  // Create basic CSS
  const stylesCss = `body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 20px;
  background: #f5f5f5;
}

.app {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1 {
  color: #333;
  text-align: center;
  margin-bottom: 30px;
}

.counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  font-size: 24px;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  transition: background 0.2s;
}

button:hover {
  background: #0056b3;
}

#counter {
  font-weight: bold;
  min-width: 50px;
  text-align: center;
}`;

  await fs.writeFile(path.join(appPath, 'src', 'styles.css'), stylesCss);

  // Update main.js to import CSS
  const updatedMainJs = `import { ok, reactive, watch } from 'onekit-js';
import './styles.css';

const state = reactive({
  title: 'Welcome to ${appName}',
  count: 0
});

watch(state, 'count', (newCount) => {
  ok('#counter').text(newCount);
});

ok('#app').html(\`
  <div class="app">
    <h1>{{title}}</h1>
    <div class="counter">
      <button id="decrement">-</button>
      <span id="counter">{{count}}</span>
      <button id="increment">+</button>
    </div>
  </div>
\`);

// Bind events
ok('#increment').click(() => state.count++);
ok('#decrement').click(() => state.count--);

// Update template
function updateView() {
  ok('#app h1').text(state.title);
  ok('#counter').text(state.count);
}

updateView();`;

  await fs.writeFile(path.join(appPath, 'src', 'main.js'), updatedMainJs);

  // Create README
  const readme = `# ${appName}

A OneKit JS application.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

\`\`\`bash
npm run build
\`\`\``;

  await fs.writeFile(path.join(appPath, 'README.md'), readme);
}
