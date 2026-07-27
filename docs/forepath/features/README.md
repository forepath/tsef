# Features Documentation

Documentation for Forepath domain backend features.

## Features

### [OpenTelemetry](./opentelemetry.md)

Optional Prometheus metrics scrape and OTLP export for the communication service. Disabled by default; requires `OTEL_ENABLED=true` and Basic auth credentials.

**Key capabilities:**

- Kill switch via `OTEL_ENABLED`
- Prometheus exposition at `/otel/metrics` (outside `/api`)
- HTTP Basic auth for scrapers
- Chatwoot configuration health gauge

## Related documentation

- **Library:** `libs/domains/shared/backend/util-otel/README.md`
- **App:** `apps/forepath/backend-communication/`
