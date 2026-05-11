// tests/integration/auth.integration.spec.ts
import { endpointCatalog } from '../helpers/api-catalog';
import { runEndpointContractSuite } from '../helpers/integration-suite';

runEndpointContractSuite(
  'Auth integration endpoints',
  endpointCatalog.filter((endpoint) => endpoint.url.startsWith('/api/auth')),
);
