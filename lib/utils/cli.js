import path from 'node:path';
import {
  AVAILABLE_COMMANDS,
  AVAILABLE_COMMANDS_ARRAY,
  ERROR_MESSAGES,
  EVENTS,
  OPTIONS,
} from './constants.js';

const USAGE = {
  GENERAL: `Usage: node file-organizer.js <${AVAILABLE_COMMANDS_ARRAY.join('|')}> <directory>`,
  ORGANIZE: `Usage: node file-organizer.js organize <source> ${OPTIONS.OUTPUT} <target>`,
  CLEANUP: `Usage: node file-organizer.js cleanup <directory> ${OPTIONS.OLDER_THAN} <days> [${OPTIONS.CONFIRM}]`,
};

export function exitWithError(message) {
  console.error(`❌ Error: ${message}`);
  process.exit(1);
}

export function describeError(error, filePath = error.path) {
  const description = ERROR_MESSAGES[error.code];
  if (!description) return `Unexpected error: ${error.message}`;
  return filePath ? `${description}: ${filePath}` : description;
}

export function attachErrorHandlers(emitter) {
  emitter.on(EVENTS.FILE_ERROR, ({ path: filePath, error }) => {
    console.error(`\n⚠️  ${describeError(error, filePath)} (skipped)`);
  });

  emitter.on(EVENTS.ERROR, (error) => {
    exitWithError(describeError(error));
  });
}

function getCommand(input) {
  if (!input) {
    throw new Error(USAGE.GENERAL);
  }

  const command = input.toLowerCase();
  if (!AVAILABLE_COMMANDS_ARRAY.includes(command)) {
    throw new Error(
      `Unknown command: ${input}\nAvailable commands: ${AVAILABLE_COMMANDS_ARRAY.join(', ')}`,
    );
  }
  return command;
}

function getOptionValue(args, option) {
  const index = args.indexOf(option);
  if (index === -1) return undefined;

  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

function getDirectory(args, command) {
  const directory = args[1];
  if (!directory || directory.startsWith('--')) {
    throw new Error(`No directory specified for ${command}`);
  }
  return path.resolve(directory);
}

function getOutputDirectory(args) {
  const output = getOptionValue(args, OPTIONS.OUTPUT);
  if (!output) {
    throw new Error(`No output directory specified\n${USAGE.ORGANIZE}`);
  }
  return path.resolve(output);
}

function getOlderThanDays(args) {
  const olderThan = getOptionValue(args, OPTIONS.OLDER_THAN);
  if (!olderThan) {
    throw new Error(`No age specified\n${USAGE.CLEANUP}`);
  }

  const days = Number(olderThan);
  if (!Number.isInteger(days) || days < 0) {
    throw new Error(
      `Invalid value for ${OPTIONS.OLDER_THAN}: ${olderThan} (expected a non-negative whole number of days)`,
    );
  }
  return days;
}

export function parseArgs(args) {
  const command = getCommand(args[0]);
  const directory = getDirectory(args, command);

  switch (command) {
    case AVAILABLE_COMMANDS.ORGANIZE:
      return { command, directory, output: getOutputDirectory(args) };
    case AVAILABLE_COMMANDS.CLEANUP:
      return {
        command,
        directory,
        olderThanDays: getOlderThanDays(args),
        confirm: args.includes(OPTIONS.CONFIRM),
      };
    default:
      return { command, directory };
  }
}
