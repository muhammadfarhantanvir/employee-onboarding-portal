// tests/load/scenarios/soak.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authHeaders } from '../helpers/auth.js';
import { readEndpoints, writeEndpoints, randomFrom } from '../helpers/endpoints.js';

export const options = {
  vus: 15,
  duration: '1h',
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function (data) {
  const endpoint = Math.random() < 0.95 ? randomFrom(readEndpoints) : randomFrom(writeEndpoints);
  const params = authHeaders(data.token);
  const response = endpoint.method === 'GET'
    ? http.get(`${BASE_URL}${endpoint.url}`, params)
    : http.request(endpoint.method, `${BASE_URL}${endpoint.url}`, JSON.stringify(endpoint.body || {}), params);
  check(response, { 'soak status < 500': (r) => r.status < 500 });
  sleep(2);
}
