/**
 * Logical file groups under `{FILE_STORAGE_ROOT}/{segment}/`.
 * Segments are fixed; call sites must not invent free-form scope strings.
 */
export const FileStorageScope = {
  invoices: 'invoices',
  supplierInvoices: 'supplierInvoices',
  datevExports: 'datevExports',
} as const;

export type FileStorageScope = (typeof FileStorageScope)[keyof typeof FileStorageScope];

/** Directory segment under `FILE_STORAGE_ROOT` for each scope. */
export const FILE_STORAGE_SCOPE_SEGMENTS: Readonly<Record<FileStorageScope, string>> = {
  [FileStorageScope.invoices]: 'invoices',
  [FileStorageScope.supplierInvoices]: 'supplier-invoices',
  [FileStorageScope.datevExports]: 'datev-exports',
};

export const FILE_STORAGE_SCOPES: readonly FileStorageScope[] = [
  FileStorageScope.invoices,
  FileStorageScope.supplierInvoices,
  FileStorageScope.datevExports,
];
