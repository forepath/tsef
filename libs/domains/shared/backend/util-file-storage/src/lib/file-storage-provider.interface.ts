/**
 * Pluggable backend for binary file persistence.
 * Implementations must reject path traversal relative to `root`.
 */
export interface FileStorageProvider {
  getType(): string;
  writeFile(root: string, storageKey: string, content: Buffer): Promise<void>;
  readFile(root: string, storageKey: string): Promise<Buffer>;
  fileExists(root: string, storageKey: string): Promise<boolean>;
}
