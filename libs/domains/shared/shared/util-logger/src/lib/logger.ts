export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export interface CreateLoggerOptions {
  level?: LogLevel;
  json?: boolean;
  prefix?: string;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function shouldLog(current: LogLevel, messageLevel: LogLevel): boolean {
  return LEVEL_ORDER[messageLevel] <= LEVEL_ORDER[current];
}

function write(
  level: LogLevel,
  message: string,
  meta: Record<string, unknown> | undefined,
  options: CreateLoggerOptions,
): void {
  const currentLevel = options.level ?? 'info';

  if (!shouldLog(currentLevel, level)) {
    return;
  }

  const prefix = options.prefix ? `[${options.prefix}] ` : '';

  if (options.json) {
    console.log(
      JSON.stringify({
        level,
        message: `${prefix}${message}`,
        ...meta,
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  const metaSuffix = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const line = `${prefix}${message}${metaSuffix}`;

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  return {
    error: (message, meta) => write('error', message, meta, options),
    warn: (message, meta) => write('warn', message, meta, options),
    info: (message, meta) => write('info', message, meta, options),
    debug: (message, meta) => write('debug', message, meta, options),
  };
}
