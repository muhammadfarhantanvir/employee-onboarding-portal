// tests/integration/notifications.integration.spec.ts
import { endpointCatalog } from '../helpers/api-catalog';
import { runEndpointContractSuite } from '../helpers/integration-suite';

runEndpointContractSuite(
  'Notifications integration endpoints',
  endpointCatalog.filter((endpoint) => endpoint.url.startsWith('/api/notifications')),
);
