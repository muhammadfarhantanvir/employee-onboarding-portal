// tests/integration/it-checklists.integration.spec.ts
import { endpointCatalog } from '../helpers/api-catalog';
import { runEndpointContractSuite } from '../helpers/integration-suite';

runEndpointContractSuite(
  'IT checklists integration endpoints',
  endpointCatalog.filter((endpoint) => endpoint.url.startsWith('/api/it-checklists')),
);
