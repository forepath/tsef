import { fillPeriodSeriesPoints, listPeriodSeriesKeys } from './fill-period-series.util';

describe('fill-period-series.util', () => {
  describe('listPeriodSeriesKeys', () => {
    it('lists inclusive day keys', () => {
      expect(listPeriodSeriesKeys('2026-01-30', '2026-02-01', 'day')).toEqual([
        '2026-01-30',
        '2026-01-31',
        '2026-02-01',
      ]);
    });

    it('lists inclusive month keys', () => {
      expect(listPeriodSeriesKeys('2026-01-15', '2026-03-02', 'month')).toEqual([
        '2026-01-01',
        '2026-02-01',
        '2026-03-01',
      ]);
    });

    it('returns empty for invalid ranges', () => {
      expect(listPeriodSeriesKeys('2026-02-01', '2026-01-01', 'day')).toEqual([]);
      expect(listPeriodSeriesKeys('bad', '2026-01-01', 'day')).toEqual([]);
    });
  });

  describe('fillPeriodSeriesPoints', () => {
    it('fills missing day buckets with defaults', () => {
      const filled = fillPeriodSeriesPoints(
        [
          { period: '2026-01-01', value: 4 },
          { period: '2026-01-03', value: 9 },
        ],
        '2026-01-01',
        '2026-01-03',
        'day',
        (period) => ({ period, value: 0 }),
      );

      expect(filled).toEqual([
        { period: '2026-01-01', value: 4 },
        { period: '2026-01-02', value: 0 },
        { period: '2026-01-03', value: 9 },
      ]);
    });

    it('fills an empty series across the full range', () => {
      const filled = fillPeriodSeriesPoints([], '2026-01-01', '2026-01-02', 'day', (period) => ({
        period,
        totalGross: 0,
      }));

      expect(filled).toEqual([
        { period: '2026-01-01', totalGross: 0 },
        { period: '2026-01-02', totalGross: 0 },
      ]);
    });
  });
});
