// tests/integration/company.integration.spec.ts
import { endpointCatalog } from '../helpers/api-catalog';
import { runEndpointContractSuite } from '../helpers/integration-suite';

runEndpointContractSuite(
  'Company integration endpoints',
  endpointCatalog.filter((endpoint) => endpoint.url.startsWith('/api/company')),
);
