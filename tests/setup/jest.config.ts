// tests/setup/jest.config.ts
import path from 'path';
import type { Config } from '@jest/types';

const rootDir = path.resolve(__dirname, '../..');
const isStrykerSandbox = rootDir.includes('.stryker-tmp');
const testPathIgnorePatterns = isStrykerSandbox
  ? ['/dist/', '/tests/e2e/']
  : ['/dist/', '/tests/e2e/', '/.stryker-tmp/'];
const modulePathIgnorePatterns = isStrykerSandbox ? [] : ['<rootDir>/.stryker-tmp'];

const transform: Config.InitialOptions['transform'] = {
  '^.+\\.tsx?$': [
    'ts-jest',
    {
      tsconfig: path.join(rootDir, 'tsconfig.spec.json'),
      diagnostics: false,
      isolatedModules: false,
    },
  ] as [string, Record<string, unknown>],
};

const baseProject: Config.InitialProjectOptions = {
  rootDir,
  transform,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testEnvironment: 'node',
  testPathIgnorePatterns,
  modulePathIgnorePatterns,
  setupFiles: ['<rootDir>/tests/setup/test-env.ts'],
  moduleNameMapper: {
    '^@nestjs/core$': '<rootDir>/apps/api/node_modules/@nestjs/core',
    '^@nestjs/testing$': '<rootDir>/apps/api/node_modules/@nestjs/testing',
    '^@nestjs/platform-express$': '<rootDir>/apps/api/node_modules/@nestjs/platform-express',
  },
};

const config: Config.InitialOptions = {
  rootDir,
  verbose: false,
  projects: [
    {
      ...baseProject,
      displayName: 'unit',
      testMatch: ['**/tests/unit/**/*.spec.ts'],
      collectCoverageFrom: [
        '<rootDir>/apps/api/src/**/*.service.ts',
        '<rootDir>/apps/api/src/**/*.guard.ts',
        '!<rootDir>/apps/api/src/**/*.module.ts',
      ],
    },
    {
      ...baseProject,
      displayName: 'smoke',
      testMatch: ['**/tests/smoke/**/*.spec.ts'],
      globalSetup: '<rootDir>/tests/setup/global-setup.ts',
      globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
    },
    {
      ...baseProject,
      displayName: 'integration',
      testMatch: ['**/tests/integration/**/*.spec.ts'],
      globalSetup: '<rootDir>/tests/setup/global-setup.ts',
      globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
    },
    {
      ...baseProject,
      displayName: 'contract',
      testMatch: ['**/tests/contract/**/*.ts'],
      globalSetup: '<rootDir>/tests/setup/global-setup.ts',
      globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
    },
    {
      ...baseProject,
      displayName: 'security',
      testMatch: ['**/tests/security/**/*.spec.ts'],
      globalSetup: '<rootDir>/tests/setup/global-setup.ts',
      globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
    },
    {
      ...baseProject,
      displayName: 'accessibility',
      testMatch: ['**/tests/accessibility/**/*.spec.ts'],
      globalSetup: '<rootDir>/tests/setup/global-setup.ts',
      globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
    },
    {
      ...baseProject,
      displayName: 'resilience',
      testMatch: ['**/tests/resilience/**/*.spec.ts'],
    },
    {
      ...baseProject,
      displayName: 'regression',
      testMatch: ['**/tests/regression/**/*.ts'],
      globalSetup: '<rootDir>/tests/setup/global-setup.ts',
      globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
    },
  ],
};

export default config;
