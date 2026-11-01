import { EventEmitter } from 'node:events';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { getCategory } from './utils/category-utils.js';
import { CATEGORY_NAMES, EVENTS } from './utils/constants.js';
import {
  copyFileBySize,
  getFiles,
  getUniquePath,
  isInsideDirectory,
} from './utils/fs-utils.js';

export class Organizer extends EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.summary = new Map(
      CATEGORY_NAMES.map((name) => [name, { count: 0, size: 0 }]),
    );
    this.totalCopied = 0;
    this.totalSize = 0;
    this.failed = 0;
  }

  async createCategoryFolders(targetDirectory) {
    for (const category of CATEGORY_NAMES) {
      await mkdir(path.join(targetDirectory, category), { recursive: true });
    }
  }

  async copyToCategory(filePath, targetDirectory) {
    const category = getCategory(filePath);
    const destination = await getUniquePath(
      path.join(targetDirectory, category, path.basename(filePath)),
    );

    this.emit(EVENTS.COPY_START, { source: filePath, destination, category });

    const size = await copyFileBySize(filePath, destination);

    const stats = this.summary.get(category);
    stats.count++;
    stats.size += size;
    this.totalCopied++;
    this.totalSize += size;

    return { destination, category, size };
  }

  async prepare(sourceDirectory, targetDirectory) {
    this.reset();

    try {
      const files = await getFiles(sourceDirectory);
      await this.createCategoryFolders(targetDirectory);

      return files.filter(
        (filePath) => !isInsideDirectory(filePath, targetDirectory),
      );
    } catch (error) {
      this.emit(EVENTS.ERROR, error);
      return null;
    }
  }

  async copyFiles(files, targetDirectory) {
    const total = files.length;

    for (const [index, filePath] of files.entries()) {
      const processed = index + 1;

      try {
        const result = await this.copyToCategory(filePath, targetDirectory);
        this.emit(EVENTS.COPY_COMPLETE, {
          source: filePath,
          ...result,
          processed,
          total,
        });
      } catch (error) {
        this.failed++;
        this.emit(EVENTS.COPY_ERROR, {
          path: filePath,
          error,
          processed,
          total,
        });
      }

      this.emit(EVENTS.FILE_PROCESSED, { processed, total });
    }

    return {
      targetDirectory,
      summary: [...this.summary].map(([category, stats]) => ({
        category,
        ...stats,
      })),
      totalCopied: this.totalCopied,
      totalSize: this.totalSize,
      failed: this.failed,
    };
  }
}
