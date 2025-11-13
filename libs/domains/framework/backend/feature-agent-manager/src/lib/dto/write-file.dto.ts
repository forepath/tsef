/**
 * DTO for writing file content.
 * Content should be base64-encoded to support both text and binary files.
 */
export class WriteFileDto {
  /**
   * File content as base64-encoded string.
   * For text files, encode UTF-8 bytes as base64.
   * For binary files, encode raw bytes as base64.
   */
  content!: string;

  /**
   * Optional encoding indicator: 'utf-8' for text files, 'base64' for binary files.
   * If not provided, defaults to 'utf-8' for backward compatibility.
   */
  encoding?: 'utf-8' | 'base64';
}
