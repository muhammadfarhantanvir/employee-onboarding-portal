// tests/integration/tasks.integration.spec.ts
import { endpointCatalog } from '../helpers/api-catalog';
import { runEndpointContractSuite } from '../helpers/integration-suite';

runEndpointContractSuite(
  'Tasks integration endpoints',
  endpointCatalog.filter((endpoint) => endpoint.url.startsWith('/api/tasks')),
);
