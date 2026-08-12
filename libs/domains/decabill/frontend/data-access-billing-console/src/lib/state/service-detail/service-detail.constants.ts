import type { MeterHistoryFilters } from '../../types/billing.types';

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function createDefaultMeterHistoryFilters(): MeterHistoryFilters {
  const to = new Date();
  const from = new Date();

  from.setDate(from.getDate() - 30);

  return {
    from: formatIsoDate(from),
    to: formatIsoDate(to),
    groupBy: 'day',
  };
}

export const DEFAULT_METER_HISTORY_FILTERS = createDefaultMeterHistoryFilters();
