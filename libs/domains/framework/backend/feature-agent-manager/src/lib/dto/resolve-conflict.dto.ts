/**
 * DTO for resolving merge conflicts.
 */
export class ResolveConflictDto {
  /**
   * File path with conflict (relative to repository root).
   */
  path!: string;

  /**
   * Merge strategy: 'yours' (accept incoming), 'mine' (accept current), 'both' (keep both).
   */
  strategy!: 'yours' | 'mine' | 'both';
}
