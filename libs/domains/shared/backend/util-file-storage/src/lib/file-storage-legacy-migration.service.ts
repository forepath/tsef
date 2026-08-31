import * as fs from 'fs';
import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';

import {
  isLegacyMigrationEnabled,
  readActiveFileStorageProviderType,
  resolveCanonicalScopeRoot,
  resolveLegacyScopeRoot,
} from './file-storage-path.config';
import { FILE_STORAGE_LOCAL_PROVIDER } from './file-storage.constants';
import { FILE_STORAGE_SCOPES, type FileStorageScope } from './file-storage-scope.constants';

interface ScopeMigrationSummary {
  scope: FileStorageScope;
  copied: number;
  skipped: number;
  errors: number;
}

/**
 * Copies files from deprecated per-scope roots into the canonical
 * `{FILE_STORAGE_ROOT}/{segment}/` layout. Enabled by default; disable with
 * `FILE_STORAGE_LEGACY_MIGRATION_ENABLED=false`. Never deletes legacy sources.
 */
@Injectable()
export class FileStorageLegacyMigrationService {
  private readonly logger = new Logger(FileStorageLegacyMigrationService.name);

  async migrateAllScopes(env: NodeJS.ProcessEnv = process.env): Promise<void> {
    if (!isLegacyMigrationEnabled(env)) {
      this.logger.log('Legacy file storage migration disabled; skipping');

      return;
    }

    if (readActiveFileStorageProviderType(env) !== FILE_STORAGE_LOCAL_PROVIDER) {
      this.logger.log('Active file storage provider is not local; skipping legacy migration');

      return;
    }

    for (const scope of FILE_STORAGE_SCOPES) {
      await this.migrateScope(scope, env);
    }
  }

  private async migrateScope(scope: FileStorageScope, env: NodeJS.ProcessEnv): Promise<void> {
    const legacyRoot = path.resolve(resolveLegacyScopeRoot(scope, env));
    const canonicalRoot = path.resolve(resolveCanonicalScopeRoot(scope, env));
    const summary: ScopeMigrationSummary = { scope, copied: 0, skipped: 0, errors: 0 };

    if (legacyRoot === canonicalRoot) {
      this.logger.log(`Legacy migration skip for ${scope}: legacy and canonical roots match (${canonicalRoot})`);

      return;
    }

    if (!(await this.isNonEmptyDirectory(legacyRoot))) {
      this.logger.log(`Legacy migration skip for ${scope}: source missing or empty (${legacyRoot})`);

      return;
    }

    this.logger.log(`Migrating file storage scope ${scope}: ${legacyRoot} -> ${canonicalRoot}`);

    await fs.promises.mkdir(canonicalRoot, { recursive: true });
    await this.copyDirectoryRecursive(legacyRoot, canonicalRoot, legacyRoot, summary);

    this.logger.log(
      `Legacy migration for ${scope}: copied=${summary.copied} skipped=${summary.skipped} errors=${summary.errors}`,
    );
  }

  private async isNonEmptyDirectory(dirPath: string): Promise<boolean> {
    try {
      const entries = await fs.promises.readdir(dirPath);

      return entries.length > 0;
    } catch {
      return false;
    }
  }

  private async copyDirectoryRecursive(
    sourceDir: string,
    destDir: string,
    legacyRoot: string,
    summary: ScopeMigrationSummary,
  ): Promise<void> {
    const entries = await fs.promises.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        await fs.promises.mkdir(destPath, { recursive: true });
        await this.copyDirectoryRecursive(sourcePath, destPath, legacyRoot, summary);
        continue;
      }

      if (!entry.isFile()) {
        summary.skipped += 1;
        continue;
      }

      try {
        await this.copyFileIdempotent(sourcePath, destPath, legacyRoot, summary);
      } catch (error) {
        summary.errors += 1;
        this.logger.warn(
          `Legacy migration failed for ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async copyFileIdempotent(
    sourcePath: string,
    destPath: string,
    legacyRoot: string,
    summary: ScopeMigrationSummary,
  ): Promise<void> {
    const relative = path.relative(legacyRoot, sourcePath);
    const sourceStat = await fs.promises.stat(sourcePath);

    try {
      const destStat = await fs.promises.stat(destPath);

      if (destStat.size === sourceStat.size) {
        summary.skipped += 1;

        return;
      }

      this.logger.warn(
        `Legacy migration skip (size mismatch, keeping destination): ${relative} ` +
          `(source=${sourceStat.size} dest=${destStat.size})`,
      );
      summary.skipped += 1;

      return;
    } catch {
      // Destination missing — copy below.
    }

    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await fs.promises.copyFile(sourcePath, destPath);
    summary.copied += 1;
  }
}
