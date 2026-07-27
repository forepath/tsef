# OpenTelemetry

Optional Prometheus metrics and OTLP export for the Forepath communication service. Disabled by default; enable explicitly when you have a scraper or collector in place.

## Application

| App                   | Default port | Service name fallback    |
| --------------------- | ------------ | ------------------------ |
| Backend Communication | `3300`       | `forepath-communication` |

Environment variables are documented in `.start-containers.env.example` for the communication app.

## Kill switch

OpenTelemetry is **off** unless all of the following are true:

1. `OTEL_ENABLED` is exactly `true` (any other value disables the module).
2. `OTEL_USERNAME` and `OTEL_PASSWORD` are both non-empty after trim.

When disabled, no metrics route is registered, the SDK does not start, and startup logs explain why.

## Metrics endpoint

When enabled, Prometheus exposition is served at **`OTEL_METRICS_PATH`** (default **`/otel/metrics`**) on the HTTP root — **outside** the `/api` global prefix.

- **Authentication:** HTTP Basic with `OTEL_USERNAME` / `OTEL_PASSWORD`.
- **Content-Type:** `text/plain` (Prometheus exposition format).
- **Unauthenticated requests:** `401 Unauthorized`.

### Smoke checks

```bash
curl -u user:pass http://localhost:3300/otel/metrics
curl -i http://localhost:3300/otel/metrics   # expect 401
```

Replace `user:pass` with your configured credentials. If you override `OTEL_METRICS_PATH`, adjust the URL accordingly.

## Startup logs

On module init, the process logs one line:

- **Disabled:** `OpenTelemetry disabled: <reason>`
- **Enabled:** `OpenTelemetry enabled: metricsPath=/otel/metrics, serviceName=<name>, otlp=enabled|disabled`

## Metrics overview

### Shared

| Area                     | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| **Host metrics**         | Node/process metrics via `nestjs-otel`                  |
| **Runtime gauge**        | `otel_enabled` (1 when the SDK started)                 |
| **Auto-instrumentation** | HTTP instrumentation; health and metrics paths excluded |

### Communication-specific

| Metric                              | Description                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `communication.chatwoot.configured` | Gauge `1` when `CHATWOOT_BASE_URL`, `CHATWOOT_API_ACCESS_TOKEN`, `CHATWOOT_ACCOUNT_ID`, and `CHATWOOT_INBOX_ID` are all valid; otherwise `0` |

The communication service does not register BullMQ queue metrics (no background queue in this app).

## Optional OTLP export

Set `OTEL_EXPORTER_OTLP_ENDPOINT` to send traces and logs to an OTLP HTTP receiver (Basic auth uses the same credentials as the metrics endpoint).

## Related documentation

- **Library:** `libs/domains/shared/backend/util-otel/README.md`

## API reference

- [Communication Manager OpenAPI](/spec/communication-manager/openapi.yaml) — `GET /otel/metrics` (root server)
