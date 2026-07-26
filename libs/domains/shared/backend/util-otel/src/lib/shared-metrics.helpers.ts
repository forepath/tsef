import { incrementCounter, recordHistogram } from './otel-meters';

export const SHARED_METER_NAME = 'forepath.shared';

export function httpStatusClass(status: number | null | undefined): string {
  if (status === null || status === undefined) {
    return 'none';
  }

  if (status >= 200 && status < 300) {
    return '2xx';
  }

  if (status >= 300 && status < 400) {
    return '3xx';
  }

  if (status >= 400 && status < 500) {
    return '4xx';
  }

  if (status >= 500) {
    return '5xx';
  }

  return 'other';
}

export function recordSharedCounter(counterName: string, attrs?: Record<string, string>, value = 1): void {
  try {
    incrementCounter(SHARED_METER_NAME, counterName, attrs, value);
  } catch {
    // fail-open when OTEL SDK is unavailable
  }
}

export function recordSharedHistogram(histogramName: string, value: number, attrs?: Record<string, string>): void {
  try {
    recordHistogram(SHARED_METER_NAME, histogramName, value, attrs);
  } catch {
    // fail-open when OTEL SDK is unavailable
  }
}
