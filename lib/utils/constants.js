export const AVAILABLE_COMMANDS = {
  SCAN: 'scan',
  DUPLICATES: 'duplicates',
  ORGANIZE: 'organize',
  CLEANUP: 'cleanup',
};

export const AVAILABLE_COMMANDS_ARRAY = Object.values(AVAILABLE_COMMANDS);

export const OPTIONS = {
  OUTPUT: '--output',
  OLDER_THAN: '--older-than',
  CONFIRM: '--confirm',
};

export const ERROR_MESSAGES = {
  ENOENT: 'File or directory not found',
  EACCES: 'Permission denied',
  EPERM: 'Operation not permitted',
  ENOTDIR: 'Not a directory',
  EISDIR: 'Is a directory',
  EBUSY: 'File is busy or locked',
  ENOSPC: 'No space left on device',
  EMFILE: 'Too many open files',
};

export const EVENTS = {
  ERROR: 'error',
  FILE_ERROR: 'file-error',
  FILE_FOUND: 'file-found',
  FILE_PROCESSED: 'file-processed',
  SCAN_START: 'scan-start',
  SCAN_COMPLETE: 'scan-complete',
  SEARCH_START: 'search-start',
  DUPLICATES_FOUND: 'duplicates-found',
  COPY_START: 'copy-start',
  COPY_COMPLETE: 'copy-complete',
  COPY_ERROR: 'copy-error',
  FILE_DELETED: 'file-deleted',
  CLEANUP_COMPLETE: 'cleanup-complete',
};

export const categories = {
  Documents: ['.pdf', '.docx', '.doc', '.txt', '.md', '.xlsx', '.pptx'],
  Images: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'],
  Archives: ['.zip', '.rar', '.tar', '.gz', '.7z'],
  Code: ['.js', '.py', '.java', '.cpp', '.html', '.css', '.json'],
  Videos: ['.mp4', '.avi', '.mkv', '.mov', '.webm'],
  Other: [],
};

export const CATEGORY_NAMES = Object.keys(categories);

export const FALLBACK_CATEGORY = 'Other';

export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const AGE_THRESHOLDS = {
  RECENT_DAYS: 7,
  MONTH_DAYS: 30,
  OLD_DAYS: 90,
};

export const TOP_FILES_COUNT = 3;

export const CLEANUP_PREVIEW_COUNT = 3;

export const HASH_PREVIEW_LENGTH = 12;

export const SEPARATOR_WIDTH = 34;

export const PROGRESS_BAR_WIDTH = 20;

export const OTHER_EXTENSION = '(other)';

export const LARGE_FILE_SIZE = 10 * 1024 * 1024;
