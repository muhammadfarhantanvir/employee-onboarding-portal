// tests/setup/global-setup.ts
import dotenv from 'dotenv';
import path from 'path';
import { resetTestDatabase } from '../../scripts/reset-test-db';
import { seedTestDatabase } from '../../prisma/seed.test';

export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), quiet: true } as never);
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true } as never);
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

  await resetTestDatabase({ quiet: true });
  await seedTestDatabase({ quiet: true });
}
