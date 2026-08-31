import { Injectable, Logger } from '@nestjs/common';

import type { FileStorageProvider } from './file-storage-provider.interface';

@Injectable()
export class FileStorageProviderFactory {
  private readonly logger = new Logger(FileStorageProviderFactory.name);
  private readonly providers = new Map<string, FileStorageProvider>();

  registerProvider(provider: FileStorageProvider): void {
    const type = provider.getType();

    if (this.providers.has(type)) {
      this.logger.warn(`File storage provider '${type}' is already registered. Overwriting.`);
    }

    this.providers.set(type, provider);
    this.logger.log(`Registered file storage provider: ${type}`);
  }

  getProvider(type: string): FileStorageProvider {
    const provider = this.providers.get(type);

    if (!provider) {
      const available = Array.from(this.providers.keys()).join(', ');

      throw new Error(`File storage provider '${type}' not found. Available: ${available || 'none'}`);
    }

    return provider;
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.providers.keys());
  }
}
