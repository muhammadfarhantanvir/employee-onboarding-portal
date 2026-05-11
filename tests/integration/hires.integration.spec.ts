// tests/integration/hires.integration.spec.ts
import { endpointCatalog } from '../helpers/api-catalog';
import { runEndpointContractSuite } from '../helpers/integration-suite';

runEndpointContractSuite(
  'Hires integration endpoints',
  endpointCatalog.filter((endpoint) => endpoint.url.startsWith('/api/hires')),
);
