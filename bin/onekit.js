#!/usr/bin/env node
import { createApp } from '../lib/cli/create.js';
const [command = 'help', ...args] = process.argv.slice(2);

function parseCreateArgs(values) {
  const positional = values.filter((value) => !value.startsWith('-'));
  const templateIndex = values.indexOf('--template');
  const template = templateIndex >= 0 ? values[templateIndex + 1] : values.includes('--javascript') || values.includes('--js') ? 'js' : 'ts';
  return { appName: positional[0], template };
}

function printHelp() {
  console.log(`OneKit JS CLI\n\nUsage:\n  onekit create <name> [--template ts|js]\n  onekit create <name> --typescript\n  onekit create <name> --javascript\n  onekit build [--out-dir <dir>] [--no-minify]\n  onekit help`);
}

try {
  if (command === 'create') {
    const { appName, template } = parseCreateArgs(args);
    const result = await createApp(appName, { template });
    console.log(`Created OneKit ${template.toUpperCase()} app: ${result.appPath}`);
  } else if (command === 'build') {
    const { build } = await import('../lib/cli/build.js');
    const outIndex = args.indexOf('--out-dir');
    const output = outIndex >= 0 ? args[outIndex + 1] : 'dist';
    await build({ output, minify: !args.includes('--no-minify') });
  } else if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`OneKit CLI error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
