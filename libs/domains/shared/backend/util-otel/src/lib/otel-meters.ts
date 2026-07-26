import { metrics } from '@opentelemetry/api';

const counterCache = new Map<string, ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>>();
const histogramCache = new Map<string, ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>>();
const gaugeRegistry = new Map<string, { value: number; attrs: Record<string, string> }>();
const registeredGaugeNames = new Set<string>();

function gaugeKey(meterName: string, gaugeName: string, attrs?: Record<string, string>): string {
  return `${meterName}:${gaugeName}:${JSON.stringify(attrs ?? {})}`;
}

function ensureObservableGauge(meterName: string, gaugeName: string): void {
  const registrationKey = `${meterName}:${gaugeName}`;

  if (registeredGaugeNames.has(registrationKey)) {
    return;
  }

  registeredGaugeNames.add(registrationKey);

  metrics
    .getMeter(meterName)
    .createObservableGauge(gaugeName)
    .addCallback((observer) => {
      for (const [key, entry] of gaugeRegistry.entries()) {
        if (!key.startsWith(`${meterName}:${gaugeName}:`)) {
          continue;
        }

        observer.observe(entry.value, entry.attrs);
      }
    });
}

export function incrementCounter(
  meterName: string,
  counterName: string,
  attrs?: Record<string, string>,
  value = 1,
): void {
  const cacheKey = `${meterName}:${counterName}`;
  let counter = counterCache.get(cacheKey);

  if (!counter) {
    counter = metrics.getMeter(meterName).createCounter(counterName);
    counterCache.set(cacheKey, counter);
  }

  counter.add(value, attrs);
}

export function recordHistogram(
  meterName: string,
  histogramName: string,
  value: number,
  attrs?: Record<string, string>,
): void {
  const cacheKey = `${meterName}:${histogramName}`;
  let histogram = histogramCache.get(cacheKey);

  if (!histogram) {
    histogram = metrics.getMeter(meterName).createHistogram(histogramName);
    histogramCache.set(cacheKey, histogram);
  }

  histogram.record(value, attrs);
}

export function setGauge(meterName: string, gaugeName: string, value: number, attrs?: Record<string, string>): void {
  ensureObservableGauge(meterName, gaugeName);
  gaugeRegistry.set(gaugeKey(meterName, gaugeName, attrs), {
    value,
    attrs: attrs ?? {},
  });
}
