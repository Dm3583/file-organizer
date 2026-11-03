import { EventEmitter } from 'node:events';
import { stat } from 'node:fs/promises';
import { EVENTS } from './utils/constants.js';
import { calculateHash, getFiles } from './utils/fs-utils.js';

export class DuplicateFinder extends EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.files = new Map();
  }

  async addFile(filePath) {
    const { size } = await stat(filePath);

    if (size === 0) return;

    const hash = await calculateHash(filePath);

    if (!this.files.has(hash)) {
      this.files.set(hash, { size, paths: [] });
    }

    this.files.get(hash).paths.push(filePath);
  }

  async scanForDuplicates(directory) {
    this.reset();
    this.emit(EVENTS.SEARCH_START, { directory });

    let files;
    try {
      const result = await getFiles(directory);
      files = result.files;

      for (const failed of result.failedDirectories) {
        this.emit(EVENTS.FILE_ERROR, failed);
      }
    } catch (error) {
      this.emit(EVENTS.ERROR, error);
      return;
    }

    const totalFiles = files.length;
    let processed = 0;

    for (const filePath of files) {
      try {
        await this.addFile(filePath);
      } catch (error) {
        this.emit(EVENTS.FILE_ERROR, { path: filePath, error });
      }

      processed++;
      this.emit(EVENTS.FILE_PROCESSED, { processed, total: totalFiles });
    }

    this.emit(EVENTS.DUPLICATES_FOUND, {
      directory,
      duplicates: this.getDuplicates(),
    });
  }

  getDuplicates() {
    const duplicates = [];
    for (const [hash, { size, paths }] of this.files) {
      if (paths.length > 1) {
        duplicates.push({
          hash,
          size,
          paths,
          wasted: size * (paths.length - 1),
        });
      }
    }

    return duplicates.sort((a, b) => b.wasted - a.wasted);
  }
}
