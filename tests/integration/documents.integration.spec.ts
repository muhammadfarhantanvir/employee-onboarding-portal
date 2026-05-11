// tests/integration/documents.integration.spec.ts
import { endpointCatalog } from '../helpers/api-catalog';
import { runEndpointContractSuite } from '../helpers/integration-suite';

runEndpointContractSuite(
  'Documents integration endpoints',
  endpointCatalog.filter((endpoint) => endpoint.url.startsWith('/api/documents')),
);
