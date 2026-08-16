export class CliError extends Error {
  constructor(message, { code = 'CLI_ERROR', hint, command } = {}) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.hint = hint;
    this.command = command;
  }
}

export function formatCliError(error) {
  const code = error?.code || 'CLI_ERROR';
  const message = error instanceof Error ? error.message : String(error);
  const lines = [`[${code}] ${message}`];
  if (error?.hint) lines.push(`Hint: ${error.hint}`);
  return lines.join('\n');
}

export function optionError(option, hint) {
  return new CliError(`Missing value for ${option}.`, {
    code: 'INVALID_OPTION',
    hint,
  });
}

export function projectError(message, hint, command) {
  return new CliError(message, { code: 'INVALID_PROJECT', hint, command });
}

export function childProcessError(message, hint, command) {
  return new CliError(message, { code: 'COMMAND_FAILED', hint, command });
}
