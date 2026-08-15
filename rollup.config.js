import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { webcrypto } from 'node:crypto';

// Node 18 does not expose Web Crypto as a global in every CI image.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

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
      file: 'dist/onekit.cjs',
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
