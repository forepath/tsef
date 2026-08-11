import { formatMeterHistoryPeriodBucket, parseMeterHistoryDateRange } from './meter-history-date.util';

describe('meter-history-date.util', () => {
  describe('parseMeterHistoryDateRange', () => {
    it('parses inclusive UTC day boundaries', () => {
      const { fromDate, toDate } = parseMeterHistoryDateRange('2026-01-01', '2026-01-31');

      expect(fromDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(toDate.toISOString()).toBe('2026-01-31T23:59:59.999Z');
    });
  });

  describe('formatMeterHistoryPeriodBucket', () => {
    it('formats day buckets from periodEnd', () => {
      const periodEnd = new Date('2026-01-15T18:30:00Z');

      expect(formatMeterHistoryPeriodBucket(periodEnd, 'day')).toBe('2026-01-15');
    });

    it('formats month buckets as YYYY-MM-01', () => {
      const periodEnd = new Date('2026-02-28T12:00:00Z');

      expect(formatMeterHistoryPeriodBucket(periodEnd, 'month')).toBe('2026-02-01');
    });
  });
});
