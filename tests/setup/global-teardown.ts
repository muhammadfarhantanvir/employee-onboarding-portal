// tests/setup/global-teardown.ts
export default async function globalTeardown(): Promise<void> {
  await Promise.resolve();
}
