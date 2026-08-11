import {
  fillMeterHistoryPeriodSeries,
  formatMeterHistoryPeriodBucket,
  listMeterHistoryPeriodKeys,
  parseMeterHistoryDateRange,
} from './meter-history-date.util';

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

  describe('listMeterHistoryPeriodKeys', () => {
    it('lists inclusive day keys', () => {
      expect(listMeterHistoryPeriodKeys('2026-01-30', '2026-02-01', 'day')).toEqual([
        '2026-01-30',
        '2026-01-31',
        '2026-02-01',
      ]);
    });

    it('lists inclusive month keys', () => {
      expect(listMeterHistoryPeriodKeys('2026-01-15', '2026-03-02', 'month')).toEqual([
        '2026-01-01',
        '2026-02-01',
        '2026-03-01',
      ]);
    });
  });

  describe('fillMeterHistoryPeriodSeries', () => {
    it('fills missing day buckets with defaults', () => {
      expect(
        fillMeterHistoryPeriodSeries(
          [
            { period: '2026-01-01', value: 4 },
            { period: '2026-01-03', value: 9 },
          ],
          '2026-01-01',
          '2026-01-03',
          'day',
          (period) => ({ period, value: 0 }),
        ),
      ).toEqual([
        { period: '2026-01-01', value: 4 },
        { period: '2026-01-02', value: 0 },
        { period: '2026-01-03', value: 9 },
      ]);
    });
  });
});
