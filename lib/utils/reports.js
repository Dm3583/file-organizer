import path from 'node:path';
import {
  AGE_THRESHOLDS,
  CLEANUP_PREVIEW_COUNT,
  HASH_PREVIEW_LENGTH,
  OPTIONS,
  OTHER_EXTENSION,
} from './constants.js';
import { getDaysSince } from './date-utils.js';
import { SEPARATOR, formatDate, formatSize, pluralize } from './format.js';

function toDisplayPath(filePath, directory) {
  const relative = path.relative(directory, filePath);
  return path
    .join(path.basename(directory), relative)
    .split(path.sep)
    .join('/');
}

function maxLength(values) {
  return Math.max(...values.map((value) => String(value).length));
}

export function printScanReport({
  totalFiles,
  totalSize,
  filesByExtensions,
  filesByLastModified,
  oldestFile,
  largestFiles,
}) {
  console.log('\n📊 Scan Results:');
  console.log(SEPARATOR);
  console.log(`Total files: ${totalFiles}`);
  console.log(`Total size: ${formatSize(totalSize)}`);

  if (totalFiles === 0) return;

  const types = Object.entries(filesByExtensions).sort(
    ([extA, a], [extB, b]) => {
      if (extA === OTHER_EXTENSION) return 1;
      if (extB === OTHER_EXTENSION) return -1;
      return b.size - a.size;
    },
  );
  const extWidth = maxLength(types.map(([ext]) => ext));
  const countWidth = maxLength(types.map(([, { count }]) => count));
  const sizeWidth = maxLength(types.map(([, { size }]) => formatSize(size)));

  console.log('\nBy File Type:');
  for (const [ext, { count, size }] of types) {
    console.log(
      `  ${ext.padEnd(extWidth)} ${String(count).padStart(countWidth)} ${pluralize(count, 'file').padEnd(5)}   ${formatSize(size).padStart(sizeWidth)}`,
    );
  }

  const { lastSevenDays, lastThirtyDays, moreThanNinetyDays } =
    filesByLastModified;

  console.log('\nFile Age:');
  console.log(
    `  Last ${AGE_THRESHOLDS.RECENT_DAYS} days:    ${lastSevenDays} ${pluralize(lastSevenDays, 'file')}`,
  );
  console.log(
    `  Last ${AGE_THRESHOLDS.MONTH_DAYS} days:   ${lastThirtyDays} ${pluralize(lastThirtyDays, 'file')}`,
  );
  console.log(
    `  Older than ${AGE_THRESHOLDS.OLD_DAYS}:  ${moreThanNinetyDays} ${pluralize(moreThanNinetyDays, 'file')}`,
  );

  const nameWidth = maxLength(largestFiles.map(({ name }) => name));
  const largestSizeWidth = maxLength(
    largestFiles.map(({ size }) => formatSize(size)),
  );

  console.log('\nLargest files:');
  largestFiles.forEach(({ name, size }, index) => {
    console.log(
      `  ${index + 1}. ${name.padEnd(nameWidth)}   ${formatSize(size).padStart(largestSizeWidth)}`,
    );
  });

  const daysAgo = getDaysSince(oldestFile.mtime);
  console.log(
    `\nOldest file: ${oldestFile.name} (modified ${daysAgo} ${pluralize(daysAgo, 'day')} ago)`,
  );
}

export function printDuplicateGroup(group, index, directory) {
  const { hash, size, paths, wasted } = group;

  console.log(
    `Group ${index + 1} (${paths.length} copies, ${formatSize(size)} each):`,
  );
  console.log(`  SHA-256: ${hash.slice(0, HASH_PREVIEW_LENGTH)}...`);
  console.log();
  for (const filePath of paths) {
    console.log(`  📄 ${toDisplayPath(filePath, directory)}`);
  }
  console.log();
  console.log(`  Wasted space: ${formatSize(wasted)}`);
}

export function printDuplicatesReport({ directory, duplicates }) {
  if (duplicates.length === 0) {
    console.log('\n✅ No duplicates found.');
    return;
  }

  const totalWasted = duplicates.reduce((sum, group) => sum + group.wasted, 0);

  console.log(
    `\nFound ${duplicates.length} duplicate ${pluralize(duplicates.length, 'group')} (${formatSize(totalWasted)} wasted):\n`,
  );

  duplicates.forEach((group, index) => {
    console.log(SEPARATOR);
    printDuplicateGroup(group, index, directory);
    console.log();
  });

  console.log(SEPARATOR);
  console.log(`💾 Total wasted space: ${formatSize(totalWasted)}`);
}

export function printOrganizeStart(sourceDirectory, targetDirectory) {
  console.log(`📦 Organizing: ${sourceDirectory}`);
  console.log(`Target: ${targetDirectory}`);
}

export function printCreatedFolders(categories) {
  console.log('\nCreating folders...');
  for (const category of categories) {
    console.log(`  ✓ ${category}/`);
  }
  console.log();
}

export function printOrganizeReport({
  targetDirectory,
  summary,
  totalCopied,
  totalSize,
  failed,
}) {
  const targetName = path.basename(targetDirectory);
  const labelWidth = maxLength(summary.map(({ category }) => `${category}:`));
  const countWidth = maxLength(summary.map(({ count }) => count));

  console.log('\n✅ Organization complete!');
  console.log('\nSummary:');
  for (const { category, count } of summary) {
    console.log(
      `  ${`${category}:`.padEnd(labelWidth)} ${String(count).padStart(countWidth)} ${pluralize(count, 'file').padEnd(5)} → ${targetName}/${category}/`,
    );
  }

  if (failed > 0) {
    console.log(`\n⚠️  Failed to copy: ${failed} ${pluralize(failed, 'file')}`);
  }

  console.log(
    `\nTotal copied: ${totalCopied} ${pluralize(totalCopied, 'file')} (${formatSize(totalSize)})`,
  );
}

function printOldFile({ name, size, mtime }) {
  const daysAgo = getDaysSince(mtime);
  console.log(name);
  console.log(`  Size: ${formatSize(size)}`);
  console.log(
    `  Modified: ${daysAgo} ${pluralize(daysAgo, 'day')} ago (${formatDate(mtime)})`,
  );
}

export function printCleanupStart(directory, olderThanDays) {
  console.log(`🧹 Cleanup: ${directory}`);
  console.log(
    `Looking for files older than ${olderThanDays} ${pluralize(olderThanDays, 'day')}...`,
  );
}

export function printOldFiles({ files, totalSize }) {
  if (files.length === 0) {
    console.log('\n✅ No old files found.');
    return;
  }

  console.log(
    `\nFound ${files.length} ${pluralize(files.length, 'file')} to delete:\n`,
  );
  console.log(SEPARATOR);

  const preview = files.slice(0, CLEANUP_PREVIEW_COUNT);
  preview.forEach((file, index) => {
    if (index > 0) console.log();
    printOldFile(file);
  });

  const hiddenCount = files.length - preview.length;
  if (hiddenCount > 0) {
    console.log(
      `\n... (${hiddenCount} more ${pluralize(hiddenCount, 'file')})`,
    );
  }

  console.log(SEPARATOR);
  console.log(
    `\nTotal: ${files.length} ${pluralize(files.length, 'file')} (${formatSize(totalSize)})`,
  );
}

export function printDryRunNotice() {
  console.log('\n⚠️  DRY RUN MODE: No files were deleted.');
  console.log(
    `To actually delete these files, run with ${OPTIONS.CONFIRM} flag.`,
  );
}

export function printDeleteWarning({ files, totalSize }) {
  console.log(
    `\n⚠️  DELETING ${files.length} ${pluralize(files.length, 'file')} (${formatSize(totalSize)}). This action cannot be undone!\n`,
  );
}

export function printCleanupReport({ deletedCount, freedSize, failed }) {
  console.log('\n✅ Cleanup complete!');
  console.log(
    `Deleted: ${deletedCount} ${pluralize(deletedCount, 'file')} (${formatSize(freedSize)} freed)`,
  );

  if (failed > 0) {
    console.log(`⚠️  Failed to delete: ${failed} ${pluralize(failed, 'file')}`);
  }
}
