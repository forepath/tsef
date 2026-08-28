import { applyS3KeyPrefix, readFileStorageS3Config } from './file-storage-s3.config';

describe('readFileStorageS3Config', () => {
  const baseEnv = {
    FILE_STORAGE_S3_BUCKET: 'billing-files',
    FILE_STORAGE_S3_ACCESS_KEY_ID: 'key-id',
    FILE_STORAGE_S3_SECRET_ACCESS_KEY: 'secret',
  };

  it('reads required fields and defaults region to auto', () => {
    const config = readFileStorageS3Config(baseEnv);

    expect(config).toEqual({
      endpoint: undefined,
      region: 'auto',
      bucket: 'billing-files',
      accessKeyId: 'key-id',
      secretAccessKey: 'secret',
      forcePathStyle: false,
      keyPrefix: undefined,
    });
  });

  it('defaults forcePathStyle to true when endpoint is set', () => {
    const config = readFileStorageS3Config({
      ...baseEnv,
      FILE_STORAGE_S3_ENDPOINT: 'https://s3.eu-central-003.backblazeb2.com',
      FILE_STORAGE_S3_REGION: 'eu-central-003',
    });

    expect(config.endpoint).toBe('https://s3.eu-central-003.backblazeb2.com');
    expect(config.region).toBe('eu-central-003');
    expect(config.forcePathStyle).toBe(true);
  });

  it('honors explicit forcePathStyle override', () => {
    expect(
      readFileStorageS3Config({
        ...baseEnv,
        FILE_STORAGE_S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
        FILE_STORAGE_S3_FORCE_PATH_STYLE: 'false',
      }).forcePathStyle,
    ).toBe(false);

    expect(
      readFileStorageS3Config({
        ...baseEnv,
        FILE_STORAGE_S3_FORCE_PATH_STYLE: 'true',
      }).forcePathStyle,
    ).toBe(true);
  });

  it('normalizes key prefix slashes', () => {
    const config = readFileStorageS3Config({
      ...baseEnv,
      FILE_STORAGE_S3_KEY_PREFIX: '/decabill/prod/',
    });

    expect(config.keyPrefix).toBe('decabill/prod');
  });

  it('requires bucket and credentials', () => {
    expect(() => readFileStorageS3Config({})).toThrow(/FILE_STORAGE_S3_BUCKET/);
    expect(() =>
      readFileStorageS3Config({
        FILE_STORAGE_S3_BUCKET: 'bucket',
      }),
    ).toThrow(/FILE_STORAGE_S3_ACCESS_KEY_ID/);
  });
});

describe('applyS3KeyPrefix', () => {
  it('joins prefix and object key', () => {
    expect(applyS3KeyPrefix('invoices/a.pdf', 'tenant-a')).toBe('tenant-a/invoices/a.pdf');
    expect(applyS3KeyPrefix('invoices/a.pdf')).toBe('invoices/a.pdf');
  });
});
