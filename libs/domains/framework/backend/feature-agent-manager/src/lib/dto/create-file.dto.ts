/**
 * DTO for creating a file or directory.
 */
export class CreateFileDto {
  type!: 'file' | 'directory';
  content?: string;
}
