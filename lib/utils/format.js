import { PROGRESS_BAR_WIDTH, SEPARATOR_WIDTH } from './constants.js';

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

export const SEPARATOR = '━'.repeat(SEPARATOR_WIDTH);

export function formatSize(bytes) {
  if (bytes < KB) {
    return `${bytes} B`;
  } else if (bytes < MB) {
    return `${(bytes / KB).toFixed(1)} KB`;
  } else if (bytes < GB) {
    return `${(bytes / MB).toFixed(1)} MB`;
  } else {
    return `${(bytes / GB).toFixed(2)} GB`;
  }
}

export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function pluralize(count, word) {
  return count === 1 ? word : `${word}s`;
}

export function drawProgressBar(current, total, width = PROGRESS_BAR_WIDTH) {
  const percentage = current / total;
  const filled = Math.round(percentage * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `${bar} ${current}/${total}`;
}

export function printProgress(label, processed, total, suffix = '') {
  const progressLine = `${label} ${drawProgressBar(processed, total)}${suffix}`;

  if (process.stdout.isTTY) {
    process.stdout.write(`\r${progressLine}`);
  } else if (processed === total) {
    process.stdout.write(progressLine);
  }
}
