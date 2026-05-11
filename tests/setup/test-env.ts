// tests/setup/test-env.ts
import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), quiet: true } as never);
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true } as never);

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'super-secret-refresh-at-least-32-chars-long';
process.env.JWT_EXPIRY = process.env.JWT_EXPIRY ?? '15m';
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d';
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
process.env.API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001';
