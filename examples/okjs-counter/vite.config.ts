import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { oneKitVitePlugin } from 'onekit-js/vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [oneKitVitePlugin()],
  server: { allowedHosts: true },
});
