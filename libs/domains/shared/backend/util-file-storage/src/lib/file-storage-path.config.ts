import * as path from 'path';

import {
  FILE_STORAGE_SCOPE_SEGMENTS,
  type FileStorageScope,
  FileStorageScope as Scopes,
} from './file-storage-scope.constants';
import { FILE_STORAGE_DEFAULT_PROVIDER } from './file-storage.constants';

/**
 * Canonical storage base.
 * Prefer `FILE_STORAGE_ROOT` (compose sets `/data`). When unset, use `{cwd}/data`
 * so local Nest/Nx matches historical Decabill layout.
 */
export function readFileStorageRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.FILE_STORAGE_ROOT?.trim();

  if (configured) {
    return configured;
  }

  return path.join(process.cwd(), 'data');
}

/**
 * Runtime I/O root for a scope: `{FILE_STORAGE_ROOT}/{segment}`.
 */
export function resolveCanonicalScopeRoot(scope: FileStorageScope, env: NodeJS.ProcessEnv = process.env): string {
  return path.join(readFileStorageRoot(env), FILE_STORAGE_SCOPE_SEGMENTS[scope]);
}

/**
 * Legacy Decabill roots used only as migration sources.
 * Deprecated for runtime I/O; prefer `resolveCanonicalScopeRoot`.
 */
export function resolveLegacyScopeRoot(scope: FileStorageScope, env: NodeJS.ProcessEnv = process.env): string {
  if (scope === Scopes.invoices) {
    return env.BILLING_INVOICE_PDF_STORAGE_PATH?.trim() || path.join(process.cwd(), 'data', 'invoices');
  }

  return env.BILLING_DATEV_EXPORT_STORAGE_PATH?.trim() || path.join(process.cwd(), 'data', 'datev-exports');
}

export function isLegacyMigrationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FILE_STORAGE_LEGACY_MIGRATION_ENABLED?.trim().toLowerCase() !== 'false';
}

export function readActiveFileStorageProviderType(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.FILE_STORAGE_PROVIDER?.trim();

  return configured || FILE_STORAGE_DEFAULT_PROVIDER;
}
