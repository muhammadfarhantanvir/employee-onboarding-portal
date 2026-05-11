// tests/integration/analytics.integration.spec.ts
import { endpointCatalog } from '../helpers/api-catalog';
import { runEndpointContractSuite } from '../helpers/integration-suite';

runEndpointContractSuite(
  'Analytics integration endpoints',
  endpointCatalog.filter((endpoint) => endpoint.url.startsWith('/api/analytics')),
);
