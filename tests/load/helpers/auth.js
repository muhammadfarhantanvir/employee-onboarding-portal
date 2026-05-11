// tests/load/helpers/auth.js
import http from 'k6/http';

export const BASE_URL = 'http://localhost:3001';

export function login() {
  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'hr@demo-company.com',
      password: 'Demo1234!',
      companySlug: 'demo-company',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (response.status !== 200) {
    throw new Error('k6 login failed. Ensure the NestJS API is running on localhost:3001 with .env.test configured.');
  }

  return { token: response.json('accessToken') };
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}
