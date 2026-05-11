// tests/load/scenarios/breakpoint.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authHeaders } from '../helpers/auth.js';

export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 150 },
    { duration: '2m', target: 200 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
  },
};

export default function (data) {
  const response = http.get(`${BASE_URL}/api/hires`, authHeaders(data.token));
  check(response, { 'breakpoint status < 500': (r) => r.status < 500 });
  sleep(1);
}
