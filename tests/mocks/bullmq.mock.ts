// tests/mocks/bullmq.mock.ts
export const addMock = jest.fn(async (name: string, data: unknown, opts?: unknown) => ({
  id: `job-${name}`,
  name,
  data,
  opts,
}));

export const addBulkMock = jest.fn(async (jobs: Array<{ name: string; data: unknown }>) =>
  jobs.map((job, index) => ({ id: `job-${index}`, ...job })),
);

export class MockQueue {
  readonly name: string;
  readonly add = addMock;
  readonly addBulk = addBulkMock;
  readonly close = jest.fn(async () => undefined);

  constructor(name: string) {
    this.name = name;
  }
}

export class MockWorker {
  readonly close = jest.fn(async () => undefined);

  constructor(
    readonly name: string,
    readonly processor?: unknown,
  ) {}
}

jest.mock('bullmq', () => ({
  Queue: MockQueue,
  Worker: MockWorker,
}));
