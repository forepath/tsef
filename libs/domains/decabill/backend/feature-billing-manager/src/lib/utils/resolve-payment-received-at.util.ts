import { BadRequestException } from '@nestjs/common';

/** Resolves the payment-received timestamp; defaults to now when omitted. */
export function resolvePaymentReceivedAt(value?: string | Date | null): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException('Paid at must be a valid datetime');
    }

    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Paid at must be a valid ISO 8601 datetime');
    }

    return parsed;
  }

  return new Date();
}
