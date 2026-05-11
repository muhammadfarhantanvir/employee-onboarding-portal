// tests/load/scenarios/spike.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authHeaders } from '../helpers/auth.js';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '15s', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '30s', target: 5 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function (data) {
  const response = http.get(`${BASE_URL}/api/analytics/overview`, authHeaders(data.token));
  check(response, { 'spike status < 500': (r) => r.status < 500 });
  sleep(1);
}
