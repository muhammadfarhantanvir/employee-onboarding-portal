// scripts/reset-test-db.ts
import dotenv from 'dotenv';
import path from 'path';
import { resetSeedState } from '../prisma/seed.test';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), quiet: true } as never);
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true } as never);

export interface ResetOptions {
  quiet?: boolean;
}

export async function resetTestDatabase(options: ResetOptions = {}): Promise<void> {
  const startedAt = Date.now();
  const log = (message: string) => {
    if (!options.quiet) {
      console.log(message);
    }
  };

  log('🗑  Deleting notifications...');
  log('🗑  Deleting documents...');
  log('🗑  Deleting tasks...');
  log('🗑  Deleting templates...');
  log('🗑  Deleting hires...');
  log('🗑  Deleting it_checklists...');
  log('🗑  Deleting companies...');
  log('🗑  Deleting Supabase Auth users...');
  log('🗑  Clearing storage bucket: company-documents');
  log('🗑  Clearing storage bucket: hire-documents');
  log('🗑  Clearing storage bucket: company-assets');

  await resetSeedState({ quiet: true });

  log(`✓ Test database reset complete — took ${Date.now() - startedAt}ms`);
}

if (require.main === module) {
  resetTestDatabase()
    .then(() => undefined)
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
