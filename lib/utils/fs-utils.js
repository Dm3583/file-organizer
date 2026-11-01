import crypto from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, copyFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { LARGE_FILE_SIZE } from './constants.js';

export async function getFiles(directory) {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

export function calculateHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export async function copySmallFile(source, destination) {
  await copyFile(source, destination);
}

export async function copyLargeFile(source, destination) {
  await pipeline(createReadStream(source), createWriteStream(destination));
}

export async function copyFileBySize(source, destination) {
  const { size } = await stat(source);

  if (size >= LARGE_FILE_SIZE) {
    await copyLargeFile(source, destination);
  } else {
    await copySmallFile(source, destination);
  }

  return size;
}

export async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function getUniquePath(filePath) {
  const { dir, name, ext } = path.parse(filePath);
  let candidate = filePath;
  let counter = 1;

  while (await fileExists(candidate)) {
    candidate = path.join(dir, `${name}(${counter})${ext}`);
    counter++;
  }

  return candidate;
}

export function isInsideDirectory(filePath, directory) {
  const relative = path.relative(directory, filePath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}
