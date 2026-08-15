import { rollup } from 'rollup';
import typescript from '@rollup/plugin-typescript';

const bundle = await rollup({
  input: 'src/vite.ts',
  plugins: [typescript({ declaration: false, declarationDir: undefined })],
});

await bundle.write({ file: 'dist/vite.mjs', format: 'es', sourcemap: true });
await bundle.write({ file: 'dist/vite.cjs', format: 'cjs', sourcemap: true });
await bundle.close();
