import { envCronOrDefault } from './env-cron-or-default';

describe('envCronOrDefault', () => {
  it('returns the default when the env var is unset', () => {
    expect(envCronOrDefault('MISSING_CRON', '0 0 * * *', {})).toBe('0 0 * * *');
  });

  it('returns the default when the env var is empty or whitespace', () => {
    expect(envCronOrDefault('EMPTY_CRON', '0 0 * * *', { EMPTY_CRON: '' })).toBe('0 0 * * *');
    expect(envCronOrDefault('BLANK_CRON', '0 0 1 * *', { BLANK_CRON: '   ' })).toBe('0 0 1 * *');
  });

  it('returns a trimmed non-empty cron pattern', () => {
    expect(envCronOrDefault('UPDATE_CHECK_CRON', '0 0 * * *', { UPDATE_CHECK_CRON: ' 15 3 * * * ' })).toBe(
      '15 3 * * *',
    );
  });
});
