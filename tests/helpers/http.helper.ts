// tests/helpers/http.helper.ts
import request, { Response } from 'supertest';
import { INestApplication } from '@nestjs/common';
import { HttpMethod } from './api-catalog';

export async function sendRequest(
  app: INestApplication,
  method: HttpMethod,
  url: string,
  token?: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  const agent = request(app.getHttpServer());
  const req =
    method === 'GET'
      ? agent.get(url)
      : method === 'POST'
        ? agent.post(url)
        : method === 'PATCH'
          ? agent.patch(url)
          : agent.delete(url);

  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }
  if (body && method !== 'GET' && method !== 'DELETE') {
    req.send(body);
  }
  return req;
}

export function expectJsonErrorShape(body: Record<string, unknown>): void {
  expect(body).toEqual(expect.objectContaining({ statusCode: expect.any(Number) }));
  expect(body.message).toBeDefined();
  expect(typeof body.message === 'string' || Array.isArray(body.message)).toBe(true);
}

export function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.length === 0 ? [] : [shapeOf(value[0])];
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, shapeOf(nested)]),
    );
  }
  return typeof value;
}
