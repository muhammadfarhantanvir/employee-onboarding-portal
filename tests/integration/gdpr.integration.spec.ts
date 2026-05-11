// tests/integration/gdpr.integration.spec.ts
import { endpointCatalog } from '../helpers/api-catalog';
import { runEndpointContractSuite } from '../helpers/integration-suite';

runEndpointContractSuite(
  'GDPR integration endpoints',
  endpointCatalog.filter((endpoint) => endpoint.url.startsWith('/api/gdpr')),
);
