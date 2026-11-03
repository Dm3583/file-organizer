import { Scanner } from './lib/scanner.js';
import { DuplicateFinder } from './lib/duplicates.js';
import { Organizer } from './lib/organizer.js';
import { Cleanup } from './lib/cleanup.js';
import {
  attachErrorHandlers,
  describeError,
  exitWithError,
  parseArgs,
} from './lib/utils/cli.js';
import {
  AVAILABLE_COMMANDS,
  CATEGORY_NAMES,
  EVENTS,
} from './lib/utils/constants.js';
import { printProgress } from './lib/utils/format.js';
import {
  printCleanupReport,
  printCleanupStart,
  printCreatedFolders,
  printDeleteWarning,
  printDryRunNotice,
  printDuplicatesReport,
  printOldFiles,
  printOrganizeReport,
  printOrganizeStart,
  printScanReport,
} from './lib/utils/reports.js';

async function runScan(directory) {
  const scanner = new Scanner();
  attachErrorHandlers(scanner);

  scanner.on(EVENTS.SCAN_START, (data) => {
    console.log(`📂 Scanning: ${data.directory}`);
  });

  scanner.on(EVENTS.FILE_PROCESSED, ({ processed, total }) => {
    printProgress('Processing...', processed, total, ' files');
  });

  scanner.on(EVENTS.SCAN_COMPLETE, (data) => {
    process.stdout.write('\n');
    printScanReport(data);
  });

  await scanner.scan(directory);
}

async function runDuplicates(directory) {
  const duplicateFinder = new DuplicateFinder();
  attachErrorHandlers(duplicateFinder);

  duplicateFinder.on(EVENTS.SEARCH_START, (data) => {
    console.log(`🔍 Searching for duplicates in: ${data.directory}`);
  });

  duplicateFinder.on(EVENTS.FILE_PROCESSED, ({ processed, total }) => {
    printProgress('Calculating hashes...', processed, total, ' files');
  });

  duplicateFinder.on(EVENTS.DUPLICATES_FOUND, (result) => {
    process.stdout.write('\n');
    printDuplicatesReport(result);
  });

  await duplicateFinder.scanForDuplicates(directory);
}

async function runOrganize(sourceDirectory, targetDirectory) {
  const organizer = new Organizer();
  attachErrorHandlers(organizer);

  organizer.on(EVENTS.COPY_ERROR, ({ path: filePath, error }) => {
    console.error(`\n⚠️  ${describeError(error, filePath)} (not copied)`);
  });

  organizer.on(EVENTS.FILE_PROCESSED, ({ processed, total }) => {
    printProgress('Copying files...', processed, total);
  });

  printOrganizeStart(sourceDirectory, targetDirectory);

  const files = await organizer.prepare(sourceDirectory, targetDirectory);
  if (!files) return;

  printCreatedFolders(CATEGORY_NAMES);

  const result = await organizer.copyFiles(files, targetDirectory);
  process.stdout.write('\n');
  printOrganizeReport(result);
}

async function runCleanup(directory, olderThanDays, confirm) {
  const cleanup = new Cleanup();
  attachErrorHandlers(cleanup);

  cleanup.on(EVENTS.FILE_PROCESSED, ({ processed, total }) => {
    printProgress('Deleting...', processed, total);
  });

  cleanup.on(EVENTS.CLEANUP_COMPLETE, (result) => {
    process.stdout.write('\n');
    printCleanupReport(result);
  });

  printCleanupStart(directory, olderThanDays);

  const result = await cleanup.findOldFiles(directory, olderThanDays);
  if (!result) return;

  printOldFiles(result);
  if (result.files.length === 0) return;

  if (!confirm) {
    printDryRunNotice();
    return;
  }

  printDeleteWarning(result);
  await cleanup.deleteFiles(result.files);
}

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, stopping...');
  process.exit(0);
});

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  exitWithError(error.message);
}

switch (options.command) {
  case AVAILABLE_COMMANDS.SCAN:
    await runScan(options.directory);
    break;
  case AVAILABLE_COMMANDS.DUPLICATES:
    await runDuplicates(options.directory);
    break;
  case AVAILABLE_COMMANDS.ORGANIZE:
    await runOrganize(options.directory, options.output);
    break;
  case AVAILABLE_COMMANDS.CLEANUP:
    await runCleanup(options.directory, options.olderThanDays, options.confirm);
    break;
}
