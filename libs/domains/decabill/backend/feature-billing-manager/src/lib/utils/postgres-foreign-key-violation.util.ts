import { QueryFailedError } from 'typeorm';

/** PostgreSQL foreign_key_violation. */
export function isPostgresForeignKeyViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { code?: string } | undefined;

  return driverError?.code === '23503';
}
