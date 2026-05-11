// tests/load/scenarios/volume.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authHeaders } from '../helpers/auth.js';
import { analyticsEndpoints, randomFrom } from '../helpers/endpoints.js';

export const options = {
  vus: 20,
  duration: '10m',
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function (data) {
  const endpoint = randomFrom(analyticsEndpoints);
  const response = http.get(`${BASE_URL}${endpoint.url}`, authHeaders(data.token));
  check(response, { 'volume aggregation status < 500': (r) => r.status < 500 });
  sleep(1);
}
