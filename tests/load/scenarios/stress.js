// tests/load/scenarios/stress.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authHeaders } from '../helpers/auth.js';

export const options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '4m', target: 80 },
    { duration: '4m', target: 150 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function (data) {
  const login = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'hr@demo-company.com',
    password: 'Demo1234!',
    companySlug: 'demo-company',
  }), { headers: { 'Content-Type': 'application/json' } });
  const hires = http.get(`${BASE_URL}/api/hires`, authHeaders(data.token));
  const overview = http.get(`${BASE_URL}/api/analytics/overview`, authHeaders(data.token));
  check(login, { 'login not server error': (r) => r.status < 500 });
  check(hires, { 'hires not server error': (r) => r.status < 500 });
  check(overview, { 'overview not server error': (r) => r.status < 500 });
  sleep(1);
}
