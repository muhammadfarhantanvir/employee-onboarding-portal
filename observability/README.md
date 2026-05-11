# Observability Stack

This folder provisions the local Grafana stack for the employee onboarding portal.

## Start

```bash
docker compose -f docker-compose.observability.yml up -d
```

Grafana runs at http://localhost:3100 with anonymous admin enabled.

Jaeger UI runs at http://localhost:16686.

Prometheus runs at http://localhost:9090.

## Application Signals

The NestJS API now exposes Prometheus metrics at:

```text
http://localhost:3001/api/metrics
```

For traces, run the API with:

```bash
OTEL_ENABLED=true
OTEL_SERVICE_NAME=employee-onboarding-api
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
LOG_FILE_PATH=logs/nestjs/app.log
```

If you run the API with Docker and the observability stack together, use:

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

The dashboards are loaded from `observability/grafana/dashboards`.

## Dashboards

- API Performance
- Distributed Trace Explorer
- Node Exporter Full, dashboard ID 1860
- Redis & BullMQ, based on dashboard ID 11835 with BullMQ panels added
- PostgreSQL / Supabase, based on dashboard ID 9628 with Supabase/Postgres panels added
- k6 Load Test Dashboard, based on dashboard ID 2587 with data and phase marker panels added
- Log Explorer & Error Tracking
- Business Metrics

## k6

Run k6 into InfluxDB:

```bash
npm run test:load:grafana
```

The k6 master script emits a `scenario_phase` counter with `scenario` and `phase` tags so the dashboard can show test phase markers. Set `PHASE` if you want a custom phase label.
