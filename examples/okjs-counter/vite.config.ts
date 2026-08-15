import { defineConfig } from 'vite';
import { oneKitVitePlugin } from 'onekit-js/vite';

export default defineConfig({
  plugins: [oneKitVitePlugin()],
  server: { allowedHosts: true },
});
