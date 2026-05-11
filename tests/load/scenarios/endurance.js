// tests/load/scenarios/endurance.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { BASE_URL, authHeaders } from '../helpers/auth.js';
import { readEndpoints, randomFrom } from '../helpers/endpoints.js';

export const options = {
  vus: 10,
  duration: '2h',
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function (data) {
  const params = authHeaders(data.token);
  const endpoint = randomFrom(readEndpoints);
  const read = http.get(`${BASE_URL}${endpoint.url}`, params);
  check(read, { 'endurance read status < 500': (r) => r.status < 500 });

  if (exec.scenario.iterationInTest % 300 === 0) {
    const tick = http.post(`${BASE_URL}/api/notifications/jobs/tick`, JSON.stringify({}), params);
    check(tick, { 'job tick status < 500': (r) => r.status < 500 });
  }
  sleep(2);
}
