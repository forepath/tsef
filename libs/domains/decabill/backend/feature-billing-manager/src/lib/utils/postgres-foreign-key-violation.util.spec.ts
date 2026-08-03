import { QueryFailedError } from 'typeorm';

import { isPostgresForeignKeyViolation } from './postgres-foreign-key-violation.util';

describe('isPostgresForeignKeyViolation', () => {
  it('returns true for PostgreSQL 23503', () => {
    const error = new QueryFailedError('DELETE', [], { code: '23503' } as never);

    expect(isPostgresForeignKeyViolation(error)).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isPostgresForeignKeyViolation(new Error('boom'))).toBe(false);
    expect(isPostgresForeignKeyViolation(new QueryFailedError('DELETE', [], { code: '23505' } as never))).toBe(false);
  });
});
