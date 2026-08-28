# @forepath/shared/backend/util-file-storage

Shared NestJS file storage with a provider registry. Built-in backends: **local** filesystem and **s3** (S3-compatible object storage).

## Usage

```ts
import { FileStorageModule, FileStorageService, FileStorageScope } from '@forepath/shared/backend/util-file-storage';

@Module({ imports: [FileStorageModule] })
export class AppModule {}

// Inject FileStorageService:
await fileStorage.writeInvoiceFile(storageKey, buffer);
await fileStorage.readDatevExportFile(storageKey);
await fileStorage.writeFile(FileStorageScope.invoices, storageKey, buffer);
```

## Path / object key layout

```
{scope-segment}/{storageKey}
```

| Scope          | Segment         | Example (local path / S3 key without prefix) |
| -------------- | --------------- | -------------------------------------------- |
| `invoices`     | `invoices`      | `invoices/sub-1/inv-1.pdf`                   |
| `datevExports` | `datev-exports` | `datev-exports/default/2026/01/export.zip`   |

- **local:** `{FILE_STORAGE_ROOT}/{segment}/{storageKey}`
- **s3:** `{FILE_STORAGE_S3_KEY_PREFIX?/}{segment}/{storageKey}` in `FILE_STORAGE_S3_BUCKET`

## Environment

| Variable                                | Default                         | Purpose                                              |
| --------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| `FILE_STORAGE_PROVIDER`                 | `local`                         | Active provider: `local` or `s3`                     |
| `FILE_STORAGE_ROOT`                     | `{cwd}/data` (compose: `/data`) | Canonical base directory (local provider)            |
| `FILE_STORAGE_LEGACY_MIGRATION_ENABLED` | `true`                          | Startup copy from legacy Decabill roots (local only) |
| `BILLING_INVOICE_PDF_STORAGE_PATH`      | _(unset)_                       | **Deprecated.** Migration source for invoices        |
| `BILLING_DATEV_EXPORT_STORAGE_PATH`     | _(unset)_                       | **Deprecated.** Migration source for DATEV exports   |

### S3-compatible provider (`FILE_STORAGE_PROVIDER=s3`)

Works with AWS S3, Cloudflare R2, Backblaze B2, Ceph RGW, MinIO, and other S3-compatible APIs. Credentials are read only when the provider performs I/O (lazy), so local deployments do not need these variables.

| Variable                            | Default                              | Purpose                                     |
| ----------------------------------- | ------------------------------------ | ------------------------------------------- |
| `FILE_STORAGE_S3_BUCKET`            | _(required)_                         | Bucket / container name                     |
| `FILE_STORAGE_S3_ACCESS_KEY_ID`     | _(required)_                         | Access key                                  |
| `FILE_STORAGE_S3_SECRET_ACCESS_KEY` | _(required)_                         | Secret key                                  |
| `FILE_STORAGE_S3_REGION`            | `auto`                               | Region (use provider docs; R2 often `auto`) |
| `FILE_STORAGE_S3_ENDPOINT`          | _(unset)_                            | Custom API endpoint (R2/B2/MinIO/Ceph)      |
| `FILE_STORAGE_S3_FORCE_PATH_STYLE`  | `true` if endpoint set, else `false` | Path-style URLs                             |
| `FILE_STORAGE_S3_KEY_PREFIX`        | _(unset)_                            | Optional key prefix (e.g. `decabill/prod`)  |

## Local provider operations

The `local` provider requires the same `FILE_STORAGE_ROOT` volume mounted on **api**, **worker**, and **scheduler**. Subdirectories are created on write or during legacy migration. The `s3` provider does not need a shared filesystem mount.

## Legacy migration

On startup (when enabled and provider is `local`), `FileStorageLegacyMigrationService` copies non-empty legacy directories into the canonical layout. It is idempotent, never deletes sources, and skips when roots already match or when the active provider is not `local`.

## Extending providers

Register additional `FileStorageProvider` implementations on `FileStorageProviderFactory` and select them with `FILE_STORAGE_PROVIDER`. Dynamic plugin loading is not wired yet.
