import fs from 'node:fs';

const path = '/home/ubuntu/onekit-js/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.types = './dist/types/index.d.ts';
pkg.exports = {
  '.': {
    types: './dist/types/index.d.ts',
    import: './dist/onekit.esm.js',
    require: './dist/onekit.cjs.js',
    browser: './dist/onekit.js'
  },
  './core': {
    types: './dist/types/core/index.d.ts',
    import: './dist/onekit.esm.js',
    require: './dist/onekit.cjs.js'
  },
  './components': {
    types: './dist/types/modules/component.d.ts',
    import: './dist/onekit.esm.js',
    require: './dist/onekit.cjs.js'
  },
  './reactive': {
    types: './dist/types/modules/reactive.d.ts',
    import: './dist/onekit.esm.js',
    require: './dist/onekit.cjs.js'
  },
  './store': {
    types: './dist/types/modules/store.d.ts',
    import: './dist/onekit.esm.js',
    require: './dist/onekit.cjs.js'
  },
  './ssr': {
    types: './dist/types/modules/ssr.d.ts',
    import: './dist/onekit.esm.js',
    require: './dist/onekit.cjs.js'
  },
  './package.json': './package.json'
};
pkg.files = ['dist', 'src', 'README.md', 'CHANGELOG.md', 'MIGRATION_GUIDE.md'];
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
