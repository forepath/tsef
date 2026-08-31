export interface FileStorageS3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Path-style URLs (MinIO, Ceph, many self-hosted). Default true when endpoint is set. */
  forcePathStyle: boolean;
  /** Optional key prefix without leading/trailing slashes (e.g. `decabill`). */
  keyPrefix?: string;
}

/**
 * Reads S3-compatible settings from environment.
 * Works with AWS S3, Cloudflare R2, Backblaze B2, Ceph RGW, MinIO, and similar APIs.
 */
export function readFileStorageS3Config(env: NodeJS.ProcessEnv = process.env): FileStorageS3Config {
  const bucket = env.FILE_STORAGE_S3_BUCKET?.trim();
  const accessKeyId = env.FILE_STORAGE_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.FILE_STORAGE_S3_SECRET_ACCESS_KEY?.trim();
  const region = env.FILE_STORAGE_S3_REGION?.trim() || 'auto';
  const endpoint = env.FILE_STORAGE_S3_ENDPOINT?.trim() || undefined;
  const keyPrefixRaw = env.FILE_STORAGE_S3_KEY_PREFIX?.trim();
  const forcePathStyleRaw = env.FILE_STORAGE_S3_FORCE_PATH_STYLE?.trim().toLowerCase();

  if (!bucket) {
    throw new Error('FILE_STORAGE_S3_BUCKET is required when using the s3 file storage provider');
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'FILE_STORAGE_S3_ACCESS_KEY_ID and FILE_STORAGE_S3_SECRET_ACCESS_KEY are required when using the s3 file storage provider',
    );
  }

  let forcePathStyle: boolean;

  if (forcePathStyleRaw === 'true' || forcePathStyleRaw === '1') {
    forcePathStyle = true;
  } else if (forcePathStyleRaw === 'false' || forcePathStyleRaw === '0') {
    forcePathStyle = false;
  } else {
    // Path-style is safer default for custom endpoints (R2/B2/MinIO/Ceph); AWS virtual-host when no endpoint.
    forcePathStyle = Boolean(endpoint);
  }

  const keyPrefix = keyPrefixRaw ? keyPrefixRaw.replace(/^\/+|\/+$/g, '').replace(/\\/g, '/') : undefined;

  return {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
    keyPrefix: keyPrefix || undefined,
  };
}

export function applyS3KeyPrefix(objectKey: string, keyPrefix?: string): string {
  if (!keyPrefix) {
    return objectKey;
  }

  return `${keyPrefix}/${objectKey}`;
}
