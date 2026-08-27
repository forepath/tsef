import { createLogger } from './logger';

describe('createLogger', () => {
  it('suppresses debug logs unless debug level is enabled', () => {
    const lines: string[] = [];
    const logger = createLogger({
      level: 'info',
      prefix: 'test',
    });

    const originalLog = console.log;
    console.log = (message?: unknown) => {
      lines.push(String(message));
    };

    logger.debug('hidden');
    logger.info('visible');

    console.log = originalLog;

    expect(lines.some((line) => line.includes('visible'))).toBe(true);
    expect(lines.some((line) => line.includes('hidden'))).toBe(false);
  });
});
