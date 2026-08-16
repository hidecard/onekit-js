#!/usr/bin/env node
import { createApp } from '../lib/cli/create.js';
import { CliError, formatCliError, optionError } from '../lib/cli/errors.js';

const [command = 'help', ...args] = process.argv.slice(2);

function parseCreateArgs(values) {
  const positional = values.filter((value) => !value.startsWith('-'));
  const templateIndex = values.indexOf('--template');
  const template = templateIndex >= 0
    ? values[templateIndex + 1]
    : values.includes('--javascript') || values.includes('--js') ? 'js' : 'ts';
  return { appName: positional[0], template };
}

function readOption(values, name) {
  const index = values.indexOf(name);
  if (index >= 0) {
    const value = values[index + 1];
    if (!value || value === '--' || value.startsWith('--')) throw optionError(name, `Use ${name} <value> or ${name}=<value>.`);
    return value;
  }
  const prefix = `${name}=`;
  const inline = values.find(value => value.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : undefined;
}

function parseRunnerArgs(values) {
  const separatorIndex = values.indexOf('--');
  const control = separatorIndex >= 0 ? values.slice(0, separatorIndex) : values;
  const forwarded = separatorIndex >= 0 ? values.slice(separatorIndex + 1) : [];
  return { cwd: readOption(control, '--cwd'), forwarded };
}

function parseOutputDir(values) {
  return readOption(values, '--out-dir') ?? 'dist';
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
    const output = parseOutputDir(args);
    await build({ output, minify: !args.includes('--no-minify') });
  } else if (command === 'dev' || command === 'preview' || command === 'test') {
    const { cwd, forwarded } = parseRunnerArgs(args);
    const output = parseOutputDir(args);
    const runner = await import('../lib/cli/run.js');
    const exitCode = command === 'dev'
      ? await runner.runDev(forwarded, { cwd })
      : command === 'preview'
        ? await runner.runPreview(forwarded, { cwd, output })
        : await runner.runTest(forwarded, { cwd });
    if (exitCode !== 0) process.exitCode = exitCode;
  } else if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
  } else {
    throw new CliError(`Unknown command: ${command}.`, {
      code: 'UNKNOWN_COMMAND',
      hint: 'Run "onekit help" to see available commands.',
    });
  }
} catch (error) {
  console.error(`OneKit CLI error: ${formatCliError(error)}`);
  process.exitCode = typeof error?.exitCode === 'number' ? error.exitCode : 1;
}
