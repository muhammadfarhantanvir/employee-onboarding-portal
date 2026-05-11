import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const tracingEnabled =
  process.env.NODE_ENV !== 'test' && process.env.OTEL_ENABLED !== 'false';

if (tracingEnabled) {
  process.env.OTEL_SERVICE_NAME =
    process.env.OTEL_SERVICE_NAME ?? 'employee-onboarding-api';

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
        'http://localhost:4318/v1/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  const shutdown = (): void => {
    void sdk.shutdown().catch((error: unknown) => {
      // Shutdown failures should not prevent the process from exiting.
      console.error(error);
    });
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
