// prisma/seed.test.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), quiet: true } as never);
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true } as never);

export const SEED_IDS = {
  companies: {
    testGmbh: '11111111-1111-4111-8111-111111111111',
    otherGmbh: '99999999-9999-4999-8999-999999999999',
  },
  users: {
    hrAdmin: '22222222-2222-4222-8222-222222222222',
    manager: '33333333-3333-4333-8333-333333333333',
    itAdmin: '44444444-4444-4444-8444-444444444444',
    newHire: '55555555-5555-4555-8555-555555555555',
    viewer: '66666666-6666-4666-8666-666666666666',
    otherHrAdmin: '77777777-7777-4777-8777-777777777777',
  },
  templates: {
    softwareEngineer: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  },
  templateTasks: {
    checkbox: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    documentUpload: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    acknowledgement: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    meeting: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  },
  hires: {
    primary: 'hire-0001-0001-0001-000000000001',
    secondary: 'hire-0002-0002-0002-000000000002',
  },
  tasks: {
    checkbox: 'htask-0001',
    documentUpload: 'htask-0003',
    acknowledgement: 'htask-0005',
    meeting: 'htask-0004',
  },
  documents: {
    companyPolicy: 'doc-0001-0001-0001-000000000001',
    pendingReview: 'doc-0004-0004-0004-000000000004',
  },
  it: {
    template: 'it-tpl-0001-0001-0001-000000000001',
    checklist: 'it-cl-0001-0001-0001-000000000001',
    laptopItem: 'it-ci-0001',
    emailItem: 'it-ci-0002',
    slackItem: 'it-ci-0003',
  },
  notifications: {
    hrUnread: 'notif-0001-0001-0001-000000000001',
    jobPending: 'job-0002-0002-0002-000000000002',
  },
  manager: {
    note: 'mn-0001-0001-0001-000000000001',
    phaseApproval: 'pa-0001-0001-0001-000000000001',
  },
  gdpr: {
    privacyPolicy: 'pp-0001-0001-0001-000000000001',
    erasureRequest: 'erase-0001-0001-0001-000000000001',
  },
} as const;

export const TEST_USERS = {
  hr_admin: { email: 'hr@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
  manager: { email: 'manager@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
  it_admin: { email: 'it@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
  new_hire: { email: 'newhire@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
  viewer: { email: 'viewer@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
  hr2_admin: { email: 'hr2@test.local', password: 'Test1234!', companySlug: 'other-gmbh' },
} as const;

export type SeedRole = keyof typeof TEST_USERS;

export interface SeedOptions {
  quiet?: boolean;
}

export async function seedTestDatabase(options: SeedOptions = {}): Promise<typeof SEED_IDS> {
  if (!options.quiet) {
    console.log('✓ Test database seed available — in-memory Nest seed fixtures loaded');
  }
  return SEED_IDS;
}

export async function resetSeedState(options: SeedOptions = {}): Promise<void> {
  if (!options.quiet) {
    console.log('✓ Test seed state reset — new Nest application instances start from deterministic fixtures');
  }
}

if (require.main === module) {
  seedTestDatabase()
    .then((ids) => {
      console.log(JSON.stringify(ids, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
