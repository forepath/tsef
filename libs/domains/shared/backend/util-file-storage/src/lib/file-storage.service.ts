import { Injectable } from '@nestjs/common';

import { readActiveFileStorageProviderType, resolveCanonicalScopeRoot } from './file-storage-path.config';
import { FileStorageProviderFactory } from './file-storage-provider.factory';
import { FileStorageScope, type FileStorageScope as FileStorageScopeType } from './file-storage-scope.constants';
import type { FileStorageProvider } from './file-storage-provider.interface';

/**
 * Facade for scope-aware file I/O. Resolves the active provider from
 * `FILE_STORAGE_PROVIDER` (default `local`) and canonical roots under `FILE_STORAGE_ROOT`.
 */
@Injectable()
export class FileStorageService {
  constructor(private readonly factory: FileStorageProviderFactory) {}

  getActiveProvider(): FileStorageProvider {
    return this.factory.getProvider(readActiveFileStorageProviderType());
  }

  async writeFile(scope: FileStorageScopeType, storageKey: string, content: Buffer): Promise<void> {
    const root = resolveCanonicalScopeRoot(scope);

    await this.getActiveProvider().writeFile(root, storageKey, content);
  }

  async readFile(scope: FileStorageScopeType, storageKey: string): Promise<Buffer> {
    const root = resolveCanonicalScopeRoot(scope);

    return await this.getActiveProvider().readFile(root, storageKey);
  }

  async fileExists(scope: FileStorageScopeType, storageKey: string): Promise<boolean> {
    const root = resolveCanonicalScopeRoot(scope);

    return await this.getActiveProvider().fileExists(root, storageKey);
  }

  async writeInvoiceFile(storageKey: string, content: Buffer): Promise<void> {
    await this.writeFile(FileStorageScope.invoices, storageKey, content);
  }

  async readInvoiceFile(storageKey: string): Promise<Buffer> {
    return await this.readFile(FileStorageScope.invoices, storageKey);
  }

  async invoiceFileExists(storageKey: string): Promise<boolean> {
    return await this.fileExists(FileStorageScope.invoices, storageKey);
  }

  async writeDatevExportFile(storageKey: string, content: Buffer): Promise<void> {
    await this.writeFile(FileStorageScope.datevExports, storageKey, content);
  }

  async readDatevExportFile(storageKey: string): Promise<Buffer> {
    return await this.readFile(FileStorageScope.datevExports, storageKey);
  }

  async datevExportFileExists(storageKey: string): Promise<boolean> {
    return await this.fileExists(FileStorageScope.datevExports, storageKey);
  }
}
