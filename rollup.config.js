import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/onekit.js',
      format: 'umd',
      name: 'OneKit',
      sourcemap: true
    },
    {
      file: 'dist/onekit.min.js',
      format: 'umd',
      name: 'OneKit',
      sourcemap: true,
      plugins: [terser()]
    },
    {
      file: 'dist/onekit.esm.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/onekit.esm.min.js',
      format: 'es',
      sourcemap: true,
      plugins: [terser()]
    },
    {
      file: 'dist/onekit.cjs.js',
      format: 'cjs',
      sourcemap: true
    }
  ],
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript()
  ]
};
