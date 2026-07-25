import { BadRequestException } from '@nestjs/common';

import { CONFIG_CHANGE_ERROR_CODES, throwConfigChangeBadRequest } from './config-change-error.constants';

describe('config-change-error.constants', () => {
  it('exposes unique error codes', () => {
    const codes = Object.values(CONFIG_CHANGE_ERROR_CODES);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it('throwConfigChangeBadRequest throws a 400 carrying the machine-readable code', () => {
    expect(() => throwConfigChangeBadRequest(CONFIG_CHANGE_ERROR_CODES.NOOP, 'Nothing to change')).toThrow(
      BadRequestException,
    );

    try {
      throwConfigChangeBadRequest(CONFIG_CHANGE_ERROR_CODES.NOOP, 'Nothing to change');
    } catch (error) {
      expect((error as BadRequestException).getStatus()).toBe(400);
      expect((error as BadRequestException).getResponse()).toEqual({
        statusCode: 400,
        message: 'Nothing to change',
        code: 'CONFIG_CHANGE_NOOP',
      });
    }
  });
});
