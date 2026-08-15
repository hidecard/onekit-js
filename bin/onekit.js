#!/usr/bin/env node
import { createApp } from '../lib/cli/create.js';

const [command = 'help', ...args] = process.argv.slice(2);

function parseCreateArgs(values) {
  const positional = values.filter((value) => !value.startsWith('-'));
  const templateIndex = values.indexOf('--template');
  const template = templateIndex >= 0
    ? values[templateIndex + 1]
    : values.includes('--javascript') || values.includes('--js') ? 'js' : 'ts';
  return { appName: positional[0], template };
}

function parseRunnerArgs(values) {
  const cwdIndex = values.indexOf('--cwd');
  const cwd = cwdIndex >= 0 ? values[cwdIndex + 1] : undefined;
  const withoutCwd = values.filter((value, index) => value !== '--cwd' && index !== cwdIndex + 1);
  const separatorIndex = withoutCwd.indexOf('--');
  const forwarded = separatorIndex >= 0 ? withoutCwd.slice(separatorIndex + 1) : withoutCwd;
  return { cwd, forwarded };
}

function printHelp() {
  console.log(`OneKit JS CLI

Usage:
  onekit create <name> [--template ts|js]
  onekit create <name> --typescript
  onekit create <name> --javascript
  onekit dev [--cwd <dir>] [-- vite-options]
  onekit build [--out-dir <dir>] [--no-minify]
  onekit preview [--cwd <dir>] [--out-dir <dir>] [-- vite-options]
  onekit test [--cwd <dir>] [-- test-runner-options]
  onekit help`);
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
  } else if (command === 'dev' || command === 'preview' || command === 'test') {
    const { cwd, forwarded } = parseRunnerArgs(args);
    const runner = await import('../lib/cli/run.js');
    const exitCode = command === 'dev'
      ? await runner.runDev(forwarded, { cwd })
      : command === 'preview'
        ? await runner.runPreview(forwarded, { cwd, output: args.includes('--out-dir') ? args[args.indexOf('--out-dir') + 1] : 'dist' })
        : await runner.runTest(forwarded, { cwd });
    if (exitCode !== 0) process.exitCode = exitCode;
  } else if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`OneKit CLI error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
