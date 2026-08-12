export type PeriodSeriesGroupBy = 'day' | 'month';

function parseUtcDateOnly(value: string): Date | null {
  const trimmed = value?.trim();

  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPeriodKey(date: Date, groupBy: PeriodSeriesGroupBy): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  if (groupBy === 'month') {
    return `${year}-${month}-01`;
  }

  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Lists every period key for [from, to] inclusive (UTC day or month buckets).
 */
export function listPeriodSeriesKeys(from: string, to: string, groupBy: PeriodSeriesGroupBy): string[] {
  const fromDate = parseUtcDateOnly(from);
  const toDate = parseUtcDateOnly(to);

  if (!fromDate || !toDate || fromDate.getTime() > toDate.getTime()) {
    return [];
  }

  const keys: string[] = [];

  if (groupBy === 'month') {
    let cursor = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), 1));

    while (cursor.getTime() <= end.getTime()) {
      keys.push(formatPeriodKey(cursor, 'month'));
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    return keys;
  }

  let cursor = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
  const end = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()));

  while (cursor.getTime() <= end.getTime()) {
    keys.push(formatPeriodKey(cursor, 'day'));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return keys;
}

/**
 * Fills missing period buckets with defaults so Decabill time-series charts stay continuous.
 */
export function fillPeriodSeriesPoints<T extends { period: string }>(
  points: T[],
  from: string,
  to: string,
  groupBy: PeriodSeriesGroupBy,
  createDefault: (period: string) => T,
): T[] {
  const byPeriod = new Map<string, T>();

  for (const point of points) {
    const period = point.period?.trim();

    if (period) {
      byPeriod.set(period, point);
    }
  }

  return listPeriodSeriesKeys(from, to, groupBy).map((period) => byPeriod.get(period) ?? createDefault(period));
}
