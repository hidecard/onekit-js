import { webcrypto } from 'node:crypto';

// serialize-javascript is loaded while Rollup config modules are evaluated.
// Install the Web Crypto global before importing Rollup/config so Node 18 CI
// behaves like newer Node versions.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { rollup } = await import('rollup');
const config = (await import('../rollup.config.js')).default;
const bundle = await rollup(config);

try {
  for (const output of config.output) await bundle.write(output);
} finally {
  await bundle.close();
}
