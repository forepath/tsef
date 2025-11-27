/**
 * DTO for unstaging files.
 */
export class UnstageFilesDto {
  /**
   * Array of file paths to unstage (relative to repository root).
   * If empty, unstage all changes.
   */
  files!: string[];
}
