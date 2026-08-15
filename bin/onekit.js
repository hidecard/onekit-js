#!/usr/bin/env node
import { createApp } from '../lib/cli/create.js';
const [command = 'help', ...args] = process.argv.slice(2);

function printHelp() {
  console.log(`OneKit JS CLI\n\nUsage:\n  onekit create <name>\n  onekit build [--out-dir <dir>] [--no-minify]\n  onekit help`);
}

try {
  if (command === 'create') {
    if (!args[0]) throw new Error('Please provide an application name.');
    await createApp(args[0]);
    console.log(`Created OneKit app: ${args[0]}`);
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
