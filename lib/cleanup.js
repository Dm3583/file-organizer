import { EventEmitter } from 'node:events';
import { stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { EVENTS } from './utils/constants.js';
import { getAgeInDays } from './utils/date-utils.js';
import { getFiles } from './utils/fs-utils.js';

export class Cleanup extends EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.oldFiles = [];
    this.totalSize = 0;
  }

  async findOldFiles(directory, olderThanDays) {
    this.reset();

    let files;
    try {
      files = await getFiles(directory);
    } catch (error) {
      this.emit(EVENTS.ERROR, error);
      return null;
    }

    for (const filePath of files) {
      let stats;

      try {
        stats = await stat(filePath);
      } catch (error) {
        this.emit(EVENTS.FILE_ERROR, { path: filePath, error });
        continue;
      }

      const { size, mtime } = stats;

      if (getAgeInDays(mtime) > olderThanDays) {
        const fileInfo = {
          name: path.basename(filePath),
          path: filePath,
          size,
          mtime,
        };

        this.oldFiles.push(fileInfo);
        this.totalSize += size;
        this.emit(EVENTS.FILE_FOUND, fileInfo);
      }
    }

    return {
      directory,
      olderThanDays,
      files: this.oldFiles,
      totalSize: this.totalSize,
    };
  }

  async deleteFiles(files) {
    const total = files.length;
    let deletedCount = 0;
    let freedSize = 0;
    let failed = 0;

    for (const [index, file] of files.entries()) {
      const processed = index + 1;

      try {
        await unlink(file.path);
        deletedCount++;
        freedSize += file.size;
        this.emit(EVENTS.FILE_DELETED, { ...file, processed, total });
      } catch (error) {
        failed++;
        this.emit(EVENTS.FILE_ERROR, { path: file.path, error });
      }

      this.emit(EVENTS.FILE_PROCESSED, { processed, total });
    }

    this.emit(EVENTS.CLEANUP_COMPLETE, { deletedCount, freedSize, failed });
  }
}
