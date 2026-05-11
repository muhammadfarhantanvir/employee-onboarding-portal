// tests/mocks/prisma.mock.ts
import { beforeEach, jest } from '@jest/globals';

export interface PrismaClientLike {
  [model: string]: unknown;
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
  $transaction: <T>(operations: T) => Promise<T>;
}

const createPrismaMock = () => ({
  $connect: jest.fn<PrismaClientLike['$connect']>(),
  $disconnect: jest.fn<PrismaClientLike['$disconnect']>(),
  $transaction: jest.fn<PrismaClientLike['$transaction']>(),
});

export type PrismaMock = ReturnType<typeof createPrismaMock>;

export const prismaMock: PrismaMock = createPrismaMock();

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.$connect.mockResolvedValue(undefined);
  prismaMock.$disconnect.mockResolvedValue(undefined);
  prismaMock.$transaction.mockImplementation(async <T>(operations: T) => operations);
});

export default prismaMock;
