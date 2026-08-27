#!/usr/bin/env node
import { createApp } from 'onekit-js/cli/create';

const values = process.argv.slice(2);
const positional = values.filter((value) => !value.startsWith('-'));
const templateIndex = values.indexOf('--template');
const template = templateIndex >= 0 ? values[templateIndex + 1] : values.includes('--javascript') || values.includes('--js') ? 'js' : 'ts';

try {
  if (values.includes('--help') || values.includes('-h')) {
    console.log('Usage: create-onekit <project-name> [--template ts|js]');
    process.exit(0);
  }
  if (!positional[0]) {
    console.log('Usage: create-onekit <project-name> [--template ts|js]');
    process.exit(1);
  }
  const result = await createApp(positional[0], { template });
  console.log(`Created OneKit ${template.toUpperCase()} app: ${result.appPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
