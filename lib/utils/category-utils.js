import path from 'node:path';
import { CATEGORY_NAMES, FALLBACK_CATEGORY, categories } from './constants.js';

export function getCategory(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const category = CATEGORY_NAMES.find((name) =>
    categories[name].includes(ext),
  );
  return category ?? FALLBACK_CATEGORY;
}
