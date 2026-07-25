import { HttpErrorResponse } from '@angular/common/http';

import { toConfigChangeFailure } from './config-change-error.utils';

describe('toConfigChangeFailure', () => {
  it('should extract message and code from a Nest bad request body', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { statusCode: 400, message: 'Nothing would change', code: 'CONFIG_CHANGE_NOOP' },
    });

    expect(toConfigChangeFailure(error)).toEqual({ message: 'Nothing would change', code: 'CONFIG_CHANGE_NOOP' });
  });

  it('should ignore an unknown code', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: 'Something else', code: 'SOME_OTHER_CODE' },
    });

    expect(toConfigChangeFailure(error).code).toBeNull();
  });

  it('should join class-validator message arrays', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: ['Server type must be a string', 'Each addon ID must be a UUID'] },
    });

    expect(toConfigChangeFailure(error).message).toBe('Server type must be a string, Each addon ID must be a UUID');
  });

  it('should fall back to the error message for plain errors', () => {
    expect(toConfigChangeFailure(new Error('boom'))).toEqual({ message: 'boom', code: null });
  });

  it('should fall back to a generic message for unknown failures', () => {
    expect(toConfigChangeFailure(null)).toEqual({ message: 'An unexpected error occurred', code: null });
  });
});
