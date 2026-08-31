import { buildScopedObjectKey } from './file-storage-object-key.util';
import { FILE_STORAGE_INVALID_PATH_ERROR } from './file-storage.constants';

describe('buildScopedObjectKey', () => {
  it('joins scope segment from root with storage key', () => {
    expect(buildScopedObjectKey('/data/invoices', 'sub-1/inv-1.pdf')).toBe('invoices/sub-1/inv-1.pdf');
    expect(buildScopedObjectKey('/data/datev-exports', 'default/2026/01/export.zip')).toBe(
      'datev-exports/default/2026/01/export.zip',
    );
  });

  it('rejects path traversal and empty keys', () => {
    expect(() => buildScopedObjectKey('/data/invoices', '../etc/passwd')).toThrow(FILE_STORAGE_INVALID_PATH_ERROR);
    expect(() => buildScopedObjectKey('/data/invoices', '')).toThrow(FILE_STORAGE_INVALID_PATH_ERROR);
    expect(() => buildScopedObjectKey('/data/invoices', 'a/../../b')).toThrow(FILE_STORAGE_INVALID_PATH_ERROR);
  });
});
