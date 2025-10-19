/* eslint-disable */
/**
 * Configuração compartilhada para testes do TransactionsService
 * Este arquivo contém mocks e helpers reutilizáveis
*/
// @ts-nocheck - Jest globals são reconhecidos em runtime durante os testes
// eslint-disable @typescript-eslint/no-explicit-any */

export const mockTransaction = {
  id: 'trans-123',
  senderUserId: 'user-sender-123',
  receiverUserId: 'user-receiver-456',
  amount: 100.0,
  fee: 1.0,
  totalAmount: 101.0,
  description: 'Payment for services',
  type: 'TRANSFER',
  status: 'PENDING',
  idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  failureReason: null,
  completedAt: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const mockCompletedTransaction = {
  ...mockTransaction,
  status: 'COMPLETED',
  completedAt: new Date('2025-01-01T10:00:00Z'),
};

export const mockTransactionEvent = {
  id: 'event-123',
  transactionId: mockTransaction.id,
  eventType: 'CREATED',
  previousStatus: null,
  newStatus: 'PENDING',
  description: 'Transação criada',
  createdAt: new Date('2025-01-01'),
};

export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

export const createMockPrismaClient = (): any => ({
  transaction: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  transactionEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
});

export const createMockUsersClient = (): any => ({
  send: jest.fn(),
  emit: jest.fn(),
});

export const createMockNotificationsClient = (): any => ({
  send: jest.fn(),
  emit: jest.fn(),
});

// Mock para resposta do users-service (validação de usuários)
export const mockUserValidationResponse = {
  exists: true,
  id: 'user-123',
  name: 'John Doe',
};

// Mock para resposta do users-service (validação de saldo)
export const mockBalanceValidationSuccess = {
  success: true,
  message: 'Balance updated successfully',
  senderPreviousBalance: 1000.0,
  senderNewBalance: 899.0,
  receiverPreviousBalance: 500.0,
  receiverNewBalance: 600.0,
};

export const mockBalanceValidationFailure = {
  success: false,
  message: 'Insufficient balance',
  currentBalance: 50.0,
  requiredAmount: 101.0,
};
