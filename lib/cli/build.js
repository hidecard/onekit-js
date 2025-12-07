import fs from 'fs-extra';
import path from 'path';
import { rollup } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function build(options = {}) {
  const { output = 'dist', minify = true } = options;

  const outputDir = path.resolve(output);
  await fs.ensureDir(outputDir);

  // Check if package.json exists
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!await fs.pathExists(packageJsonPath)) {
    throw new Error('package.json not found. Make sure you\'re in a OneKit project directory.');
  }

  const packageJson = await fs.readJson(packageJsonPath);
  const entryPoint = packageJson.main || 'src/index.js';

  // Check if entry point exists
  const entryPath = path.join(process.cwd(), entryPoint);
  if (!await fs.pathExists(entryPath)) {
    throw new Error(`Entry point "${entryPoint}" not found.`);
  }

  console.log(`Building from ${entryPoint}...`);

  // Rollup configuration
  const inputOptions = {
    input: entryPath,
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        presets: [
          ['@babel/preset-env', {
            targets: '> 0.25%, not dead',
            modules: false
          }]
        ],
        exclude: 'node_modules/**'
      })
    ]
  };

  const outputOptions = [
    // ESM build
    {
      file: path.join(outputDir, `${packageJson.name}.esm.js`),
      format: 'es',
      sourcemap: true
    },
    // CommonJS build
    {
      file: path.join(outputDir, `${packageJson.name}.cjs.js`),
      format: 'cjs',
      sourcemap: true
    },
    // UMD build
    {
      file: path.join(outputDir, `${packageJson.name}.js`),
      format: 'umd',
      name: packageJson.name.replace(/-/g, '').replace(/^\w/, c => c.toUpperCase()),
      sourcemap: true
    }
  ];

  // Add minified versions if requested
  if (minify) {
    outputOptions.push(
      {
        file: path.join(outputDir, `${packageJson.name}.esm.min.js`),
        format: 'es',
        plugins: [terser()],
        sourcemap: true
      },
      {
        file: path.join(outputDir, `${packageJson.name}.cjs.min.js`),
        format: 'cjs',
        plugins: [terser()],
        sourcemap: true
      },
      {
        file: path.join(outputDir, `${packageJson.name}.min.js`),
        format: 'umd',
        name: packageJson.name.replace(/-/g, '').replace(/^\w/, c => c.toUpperCase()),
        plugins: [terser()],
        sourcemap: true
      }
    );
  }

  try {
    const bundle = await rollup(inputOptions);

    for (const outputOption of outputOptions) {
      await bundle.write(outputOption);
      console.log(`✓ Generated ${path.relative(process.cwd(), outputOption.file)}`);
    }

    await bundle.close();

    // Copy package.json to dist
    const distPackageJson = {
      ...packageJson,
      main: `${packageJson.name}.cjs.js`,
      module: `${packageJson.name}.esm.js`,
      browser: `${packageJson.name}.js`,
      types: packageJson.types ? path.basename(packageJson.types) : undefined,
      scripts: undefined,
      devDependencies: undefined,
      files: ['*']
    };

    await fs.writeJson(path.join(outputDir, 'package.json'), distPackageJson, { spaces: 2 });

    // Copy README if it exists
    const readmePath = path.join(process.cwd(), 'README.md');
    if (await fs.pathExists(readmePath)) {
      await fs.copy(readmePath, path.join(outputDir, 'README.md'));
    }

    console.log(`Build completed successfully! Output: ${outputDir}`);

  } catch (error) {
    console.error('Build failed:', error);
    throw error;
  }
}
