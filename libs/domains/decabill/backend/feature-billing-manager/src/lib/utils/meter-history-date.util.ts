import { BadRequestException } from '@nestjs/common';

export function parseMeterHistoryDateBoundary(value: string, boundary: 'start' | 'end'): Date {
  const date = new Date(`${value}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date range');
  }

  return date;
}

export function parseMeterHistoryDateRange(from: string, to: string): { fromDate: Date; toDate: Date } {
  const fromDate = parseMeterHistoryDateBoundary(from, 'start');
  const toDate = parseMeterHistoryDateBoundary(to, 'end');

  if (fromDate > toDate) {
    throw new BadRequestException('Invalid date range: from must be before to');
  }

  return { fromDate, toDate };
}

export function formatMeterHistoryPeriodBucket(periodEnd: Date, groupBy: 'day' | 'month'): string {
  const year = periodEnd.getUTCFullYear();
  const month = String(periodEnd.getUTCMonth() + 1).padStart(2, '0');

  if (groupBy === 'month') {
    return `${year}-${month}-01`;
  }

  const day = String(periodEnd.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
