// tests/setup/create-test-app.ts
import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../apps/api/src/app.module';

export interface TestAppContext {
  app: INestApplication;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestAppContext> {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), quiet: true } as never);
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true } as never);

  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret-at-least-32-chars-long';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'super-secret-refresh-at-least-32-chars-long';
  process.env.JWT_EXPIRY = process.env.JWT_EXPIRY ?? '15m';
  process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();

  return {
    app,
    close: async () => {
      await app.close();
    },
  };
}

export default createTestApp;
