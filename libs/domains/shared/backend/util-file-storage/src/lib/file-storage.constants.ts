/** Local filesystem provider type id. */
export const FILE_STORAGE_LOCAL_PROVIDER = 'local';

/** S3-compatible object storage provider type id (AWS, R2, Backblaze, Ceph, MinIO, …). */
export const FILE_STORAGE_S3_PROVIDER = 's3';

/** Thrown when a storage key would resolve outside the configured root. */
export const FILE_STORAGE_INVALID_PATH_ERROR = 'Invalid file storage path';

/** Default active provider type when `FILE_STORAGE_PROVIDER` is unset. */
export const FILE_STORAGE_DEFAULT_PROVIDER = FILE_STORAGE_LOCAL_PROVIDER;
