import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../common/services/prisma.service';
import { S3Service } from '../../../common/services/s3.service';
import { RedisService } from '../../../common/services/redis.service';
import { PinoLogger } from 'nestjs-pino';
import { ClientProxy } from '@nestjs/microservices';
import {
  mockUser,
  mockBankingDetails,
  mockLogger,
  createMockPrismaService,
  createMockRedisService,
  createMockS3Service,
  createMockClientProxy,
} from './test-helpers';

describe('UsersService - Transaction Operations', () => {
  let service: UsersService;
  let prismaService: ReturnType<typeof createMockPrismaService>;
  let redisService: ReturnType<typeof createMockRedisService>;
  let s3Service: ReturnType<typeof createMockS3Service>;
  let mockClientProxy: ReturnType<typeof createMockClientProxy>;

  beforeEach(async () => {
    prismaService = createMockPrismaService();
    redisService = createMockRedisService();
    s3Service = createMockS3Service();
    mockClientProxy = createMockClientProxy();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: S3Service,
          useValue: s3Service,
        },
        {
          provide: 'TRANSACTIONS_SERVICE_CLIENT',
          useValue: mockClientProxy,
        },
        {
          provide: 'NOTIFICATIONS_SERVICE_CLIENT',
          useValue: mockClientProxy,
        },
        {
          provide: `PinoLogger:${UsersService.name}`,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('processTransactionBalance', () => {
    const transactionId = 'trans-123';
    const senderId = 'sender-id';
    const receiverId = 'receiver-id';
    const totalAmount = 100; // Valor total debitado do sender
    const netAmount = 95; // Valor líquido creditado no receiver (após taxas)

    it('should handle idempotency - skip if transaction already processed', async () => {
      const processBalanceDto = {
        transactionId,
        senderId,
        receiverId,
        totalAmount,
        netAmount,
      };

      // Mock do balanceHistory.findFirst ANTES do $transaction
      // (a verificação de idempotência acontece ANTES da transação começar)
      prismaService.balanceHistory.findFirst.mockResolvedValue({
        id: 'history-1',
        userId: senderId,
        transactionId,
        changeAmount: -totalAmount,
        previousBalance: 1000,
        newBalance: 900,
        operation: 'DEBIT',
        description: 'Transferência enviada',
        createdAt: new Date(),
      });

      const result = await service.processTransactionBalance(processBalanceDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('already processed');
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should process transaction successfully with sufficient balance', async () => {
      const processBalanceDto = {
        transactionId,
        senderId,
        receiverId,
        totalAmount,
        netAmount,
      };

      const senderBanking = { 
        ...mockBankingDetails, 
        userId: senderId, 
        balance: 500,
        user: { name: 'Sender Name', email: 'sender@example.com' }
      };
      const receiverBanking = { 
        ...mockBankingDetails, 
        userId: receiverId, 
        balance: 200,
        user: { name: 'Receiver Name', email: 'receiver@example.com' }
      };

      // Mock da transação com sucesso
      prismaService.$transaction.mockImplementation(async (callback) => {
        // Mock do callback da transação
        const txMock = {
          bankingDetails: {
            findUnique: jest.fn()
              .mockResolvedValueOnce(senderBanking)
              .mockResolvedValueOnce(receiverBanking),
            update: jest.fn().mockResolvedValue({}),
          },
          balanceHistory: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(txMock);
      });

      const result = await service.processTransactionBalance(processBalanceDto);

      expect(result.success).toBe(true);
      expect(redisService.del).toHaveBeenCalledWith(`user:${senderId}`);
      expect(redisService.del).toHaveBeenCalledWith(`user_transaction_balance:${senderId}`);
      expect(redisService.del).toHaveBeenCalledWith(`user:${receiverId}`);
      expect(redisService.del).toHaveBeenCalledWith(`user_transaction_balance:${receiverId}`);
    });

    it('should return failure if sender has insufficient balance', async () => {
      const processBalanceDto = {
        transactionId,
        senderId,
        receiverId,
        totalAmount: 1500, // Mais que o saldo disponível
        netAmount: 1425,
      };

      const senderBanking = { 
        ...mockBankingDetails, 
        userId: senderId, 
        balance: 500,
        user: { name: 'Sender Name', email: 'sender@example.com' }
      };

      // Mock da transação retornando falha por saldo insuficiente
      prismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {
          bankingDetails: {
            findUnique: jest.fn().mockResolvedValueOnce(senderBanking),
            update: jest.fn(),
          },
          balanceHistory: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
          },
        };

        return callback(txMock);
      });

      const result = await service.processTransactionBalance(processBalanceDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Insufficient balance');
    });

    it('should handle transaction with minimum amount (edge case)', async () => {
      const processBalanceDto = {
        transactionId,
        senderId,
        receiverId,
        totalAmount: 0.01, // Valor mínimo
        netAmount: 0.01,
      };

      const senderBanking = { 
        ...mockBankingDetails, 
        userId: senderId, 
        balance: 1,
        user: { name: 'Sender', email: 'sender@example.com' }
      };
      const receiverBanking = { 
        ...mockBankingDetails, 
        userId: receiverId, 
        balance: 0,
        user: { name: 'Receiver', email: 'receiver@example.com' }
      };

      // Mock da transação com sucesso
      prismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {
          bankingDetails: {
            findUnique: jest.fn()
              .mockResolvedValueOnce(senderBanking)
              .mockResolvedValueOnce(receiverBanking),
            update: jest.fn().mockResolvedValue({}),
          },
          balanceHistory: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(txMock);
      });

      const result = await service.processTransactionBalance(processBalanceDto);

      expect(result.success).toBe(true);
    });

    it('should handle high precision decimal amounts correctly', async () => {
      const processBalanceDto = {
        transactionId,
        senderId,
        receiverId,
        totalAmount: 123.45, // Valor com decimais
        netAmount: 117.28, // Após taxas de 5%
      };

      const senderBanking = { 
        ...mockBankingDetails, 
        userId: senderId, 
        balance: 500,
        user: { name: 'Sender', email: 'sender@example.com' }
      };
      const receiverBanking = { 
        ...mockBankingDetails, 
        userId: receiverId, 
        balance: 200,
        user: { name: 'Receiver', email: 'receiver@example.com' }
      };

      // Mock da transação com sucesso
      prismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {
          bankingDetails: {
            findUnique: jest.fn()
              .mockResolvedValueOnce(senderBanking)
              .mockResolvedValueOnce(receiverBanking),
            update: jest.fn().mockResolvedValue({}),
          },
          balanceHistory: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(txMock);
      });

      const result = await service.processTransactionBalance(processBalanceDto);

      expect(result.success).toBe(true);
    });
  });
});
