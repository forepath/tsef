// Types based on OpenAPI spec - File System Operations
export interface FileContentDto {
  content: string; // base64-encoded
  encoding: 'utf-8' | 'base64';
}

export interface FileNodeDto {
  name: string;
  type: 'file' | 'directory';
  path: string; // Relative path from /app
  size?: number; // File size in bytes (only for files)
  modifiedAt?: string; // ISO 8601 timestamp
}

export interface WriteFileDto {
  content: string; // base64-encoded
  encoding?: 'utf-8' | 'base64';
}

export interface CreateFileDto {
  type: 'file' | 'directory';
  content?: string; // Optional content for file creation (base64-encoded)
}

export interface ListDirectoryParams {
  path?: string; // Directory path relative to /app (defaults to '.')
}
