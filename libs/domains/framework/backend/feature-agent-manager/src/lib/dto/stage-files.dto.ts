/**
 * DTO for staging files.
 */
export class StageFilesDto {
  /**
   * Array of file paths to stage (relative to repository root).
   * If empty, stage all changes.
   */
  files!: string[];
}
