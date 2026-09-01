import { BadRequestException } from '@nestjs/common';

import { resolvePaymentReceivedAt } from './resolve-payment-received-at.util';

describe('resolvePaymentReceivedAt', () => {
  it('returns the provided Date', () => {
    const value = new Date('2026-08-01T10:00:00.000Z');

    expect(resolvePaymentReceivedAt(value)).toEqual(value);
  });

  it('parses ISO strings', () => {
    expect(resolvePaymentReceivedAt('2026-08-01T10:00:00.000Z').toISOString()).toBe('2026-08-01T10:00:00.000Z');
  });

  it('defaults to now when omitted', () => {
    const before = Date.now();
    const resolved = resolvePaymentReceivedAt();
    const after = Date.now();

    expect(resolved.getTime()).toBeGreaterThanOrEqual(before);
    expect(resolved.getTime()).toBeLessThanOrEqual(after);
  });

  it('rejects invalid strings', () => {
    expect(() => resolvePaymentReceivedAt('not-a-date')).toThrow(BadRequestException);
  });
});
