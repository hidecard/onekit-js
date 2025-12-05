import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'onekit-js': resolve(__dirname, './dist/onekit.esm.js')
    }
  }
});
