import { BadRequestException } from '@nestjs/common';

/** Inclusive UTC day span limit for meter history queries (groupBy=day). */
export const MAX_METER_HISTORY_DAY_SPAN = 366;

/** Inclusive calendar-month span limit for meter history queries (groupBy=month). */
export const MAX_METER_HISTORY_MONTH_SPAN = 60;

export function parseMeterHistoryDateBoundary(value: string, boundary: 'start' | 'end'): Date {
  const date = new Date(`${value}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date range');
  }

  return date;
}

export function parseMeterHistoryDateRange(
  from: string,
  to: string,
  groupBy: 'day' | 'month' = 'day',
): { fromDate: Date; toDate: Date } {
  const fromDate = parseMeterHistoryDateBoundary(from, 'start');
  const toDate = parseMeterHistoryDateBoundary(to, 'end');

  if (fromDate > toDate) {
    throw new BadRequestException('Invalid date range: from must be before to');
  }

  if (groupBy === 'month') {
    const monthSpan =
      (toDate.getUTCFullYear() - fromDate.getUTCFullYear()) * 12 + (toDate.getUTCMonth() - fromDate.getUTCMonth()) + 1;

    if (monthSpan > MAX_METER_HISTORY_MONTH_SPAN) {
      throw new BadRequestException(
        `Invalid date range: maximum span is ${MAX_METER_HISTORY_MONTH_SPAN} months when grouping by month`,
      );
    }
  } else {
    const fromDay = Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate());
    const toDay = Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate());
    const daySpan = Math.floor((toDay - fromDay) / (24 * 60 * 60 * 1000)) + 1;

    if (daySpan > MAX_METER_HISTORY_DAY_SPAN) {
      throw new BadRequestException(
        `Invalid date range: maximum span is ${MAX_METER_HISTORY_DAY_SPAN} days when grouping by day`,
      );
    }
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

/**
 * Lists every period key for [from, to] inclusive (UTC), matching history bucket formatting.
 */
export function listMeterHistoryPeriodKeys(from: string, to: string, groupBy: 'day' | 'month'): string[] {
  const { fromDate, toDate } = parseMeterHistoryDateRange(from, to, groupBy);
  const keys: string[] = [];

  if (groupBy === 'month') {
    let cursor = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), 1));

    while (cursor.getTime() <= end.getTime()) {
      keys.push(formatMeterHistoryPeriodBucket(cursor, 'month'));
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    return keys;
  }

  let cursor = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
  const end = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()));

  while (cursor.getTime() <= end.getTime()) {
    keys.push(formatMeterHistoryPeriodBucket(cursor, 'day'));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return keys;
}

/**
 * Fills missing period buckets with defaults so time-series charts stay continuous.
 */
export function fillMeterHistoryPeriodSeries<T extends { period: string }>(
  points: T[],
  from: string,
  to: string,
  groupBy: 'day' | 'month',
  createDefault: (period: string) => T,
): T[] {
  const byPeriod = new Map<string, T>();

  for (const point of points) {
    const period = point.period?.trim();

    if (period) {
      byPeriod.set(period, point);
    }
  }

  return listMeterHistoryPeriodKeys(from, to, groupBy).map((period) => byPeriod.get(period) ?? createDefault(period));
}
