import * as path from 'path';

import { FILE_STORAGE_INVALID_PATH_ERROR } from './file-storage.constants';

/**
 * Builds a posix object key / relative path from a scope root and storage key.
 * Rejects path traversal. Used by S3 (and suitable for any prefix-based backend).
 */
export function buildScopedObjectKey(root: string, storageKey: string): string {
  const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalizedKey || normalizedKey.includes('\0') || normalizedKey.split('/').includes('..')) {
    throw new Error(FILE_STORAGE_INVALID_PATH_ERROR);
  }

  const segment = path.basename(path.resolve(root)).replace(/\\/g, '/');

  if (!segment || segment === '.' || segment === '..') {
    throw new Error(FILE_STORAGE_INVALID_PATH_ERROR);
  }

  return path.posix.join(segment, normalizedKey);
}
