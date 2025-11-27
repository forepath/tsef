/**
 * DTO for creating a new branch.
 */
export class CreateBranchDto {
  /**
   * Branch name (will be prefixed with conventional commit prefix if not already present).
   * User can override with custom name.
   */
  name!: string;

  /**
   * Whether to use conventional commit prefix (feat/, fix/, chore/, etc.).
   * If false, use the name as-is.
   */
  useConventionalPrefix?: boolean;

  /**
   * Conventional commit type (feat, fix, chore, etc.).
   * Only used if useConventionalPrefix is true.
   */
  conventionalType?: 'feat' | 'fix' | 'chore' | 'docs' | 'style' | 'refactor' | 'test' | 'perf';

  /**
   * Base branch to create from (defaults to current branch).
   */
  baseBranch?: string;
}
