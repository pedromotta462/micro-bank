/**
 * Configuração compartilhada para testes do UsersService
 * Este arquivo contém mocks e helpers reutilizáveis
 */

// @ts-nocheck - Jest globals são reconhecidos em runtime durante os testes
/* eslint-disable @typescript-eslint/no-explicit-any */

export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashed_password',
  address: '123 Main St',
  profilePicture: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const mockBankingDetails = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  userId: mockUser.id,
  balance: 1000.0,
  accountNumber: '12345678',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const mockLogger: any = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

export const createMockPrismaService = (): any => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  bankingDetails: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  balanceHistory: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
});

export const createMockRedisService = (): any => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
});

export const createMockS3Service = (): any => ({
  uploadFile: jest.fn(),
});

export const createMockClientProxy = (): any => ({
  send: jest.fn(),
  emit: jest.fn(),
});
