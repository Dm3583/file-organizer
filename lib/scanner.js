import { EventEmitter } from 'node:events';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import {
  AGE_THRESHOLDS,
  EVENTS,
  OTHER_EXTENSION,
  TOP_FILES_COUNT,
} from './utils/constants.js';
import { getLastModifiedThreshold } from './utils/date-utils.js';
import { getFiles } from './utils/fs-utils.js';

export class Scanner extends EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  async scan(directory) {
    this.reset();
    this.emit(EVENTS.SCAN_START, { directory });

    let files;
    try {
      files = await getFiles(directory);
    } catch (error) {
      this.emit(EVENTS.ERROR, error);
      return;
    }

    const total = files.length;

    const recentThreshold = getLastModifiedThreshold(
      AGE_THRESHOLDS.RECENT_DAYS,
    );
    const monthThreshold = getLastModifiedThreshold(AGE_THRESHOLDS.MONTH_DAYS);
    const oldThreshold = getLastModifiedThreshold(AGE_THRESHOLDS.OLD_DAYS);

    for (const [index, filePath] of files.entries()) {
      try {
        await this.addFile(filePath, {
          recentThreshold,
          monthThreshold,
          oldThreshold,
        });
      } catch (error) {
        this.emit(EVENTS.FILE_ERROR, { path: filePath, error });
      }

      this.emit(EVENTS.FILE_PROCESSED, { processed: index + 1, total });
    }

    this.largestFiles = this.largestFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, TOP_FILES_COUNT);

    this.emit(EVENTS.SCAN_COMPLETE, {
      totalFiles: this.totalFiles,
      totalSize: this.totalSize,
      filesByExtensions: this.filesByExtensions,
      filesByLastModified: this.filesByLastModified,
      oldestFile: this.oldestFile,
      largestFiles: this.largestFiles,
    });
  }

  async addFile(filePath, { recentThreshold, monthThreshold, oldThreshold }) {
    const { size, mtime } = await stat(filePath);
    const name = path.basename(filePath);
    const ext = path.extname(name).toLowerCase() || OTHER_EXTENSION;

    this.totalSize += size;

    if (!this.filesByExtensions[ext]) {
      this.filesByExtensions[ext] = { count: 0, size: 0 };
    }
    this.filesByExtensions[ext].count++;
    this.filesByExtensions[ext].size += size;

    const fileInfo = { name, path: filePath, size, mtime, ext };

    this.largestFiles.push(fileInfo);

    if (!this.oldestFile || mtime < this.oldestFile.mtime) {
      this.oldestFile = fileInfo;
    }

    if (mtime >= recentThreshold) {
      this.filesByLastModified.lastSevenDays++;
    }
    if (mtime >= monthThreshold) {
      this.filesByLastModified.lastThirtyDays++;
    }
    if (mtime < oldThreshold) {
      this.filesByLastModified.moreThanNinetyDays++;
    }

    this.totalFiles++;
    this.emit(EVENTS.FILE_FOUND, fileInfo);
  }

  reset() {
    this.totalFiles = 0;
    this.totalSize = 0;
    this.filesByExtensions = {};
    this.filesByLastModified = {
      lastSevenDays: 0,
      lastThirtyDays: 0,
      moreThanNinetyDays: 0,
    };
    this.oldestFile = null;
    this.largestFiles = [];
  }
}
