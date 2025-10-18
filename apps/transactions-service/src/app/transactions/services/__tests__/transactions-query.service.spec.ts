import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from '../transactions.service';
import { PinoLogger } from 'nestjs-pino';
import {
  mockTransaction,
  mockCompletedTransaction,
  mockLogger,
  createMockPrismaClient,
  createMockUsersClient,
  createMockNotificationsClient,
} from './test-helpers';

describe('TransactionsService - Query Operations', () => {
  let service: TransactionsService;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let mockUsersClient: ReturnType<typeof createMockUsersClient>;
  let mockNotificationsClient: ReturnType<typeof createMockNotificationsClient>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaClient();
    mockUsersClient = createMockUsersClient();
    mockNotificationsClient = createMockNotificationsClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: `PinoLogger:${TransactionsService.name}`,
          useValue: mockLogger,
        },
        {
          provide: 'USERS_SERVICE_CLIENT',
          useValue: mockUsersClient,
        },
        {
          provide: 'NOTIFICATIONS_SERVICE_CLIENT',
          useValue: mockNotificationsClient,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    (service as any).prisma = mockPrisma;

    jest.clearAllMocks();
  });

  describe('getTransactionById', () => {
    const getByIdDto = {
      transactionId: 'trans-123',
      userId: 'user-sender-123',
    };

    it('should return transaction by id successfully', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionById(getByIdDto);

      expect(result).toEqual(mockTransaction);
      expect(mockPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: getByIdDto.transactionId },
      });
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.getTransactionById(getByIdDto)).rejects.toThrow(
        new NotFoundException('Transação não encontrada')
      );
    });

    it('should return transaction even if user is not participant (no authorization check)', async () => {
      // A implementação atual não verifica se o usuário é participante
      const unauthorizedDto = {
        transactionId: 'trans-123',
        userId: 'user-unauthorized-999',
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionById(unauthorizedDto);

      // Retorna a transação normalmente (sem validação de autorização)
      expect(result).toEqual(mockTransaction);
    });

    it('should allow sender to view transaction', async () => {
      const senderDto = {
        transactionId: 'trans-123',
        userId: 'user-sender-123',
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionById(senderDto);

      expect(result).toEqual(mockTransaction);
    });

    it('should allow receiver to view transaction', async () => {
      const receiverDto = {
        transactionId: 'trans-123',
        userId: 'user-receiver-456',
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionById(receiverDto);

      expect(result).toEqual(mockTransaction);
    });
  });

  describe('getTransactionsByUser', () => {
    const getByUserDto = {
      userId: 'user-sender-123',
      page: 1,
      pageSize: 10,
    };

    it('should return paginated transactions for user', async () => {
      const transactions = [mockTransaction, mockCompletedTransaction];

      mockPrisma.transaction.findMany.mockResolvedValue(transactions);
      mockPrisma.transaction.count.mockResolvedValue(2);

      const result = await service.getTransactionsByUser(getByUserDto);

      expect(result).toEqual({
        transactions: transactions,
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('should filter transactions where user is sender or receiver', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      await service.getTransactionsByUser(getByUserDto);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderUserId: getByUserDto.userId },
            { receiverUserId: getByUserDto.userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle empty results', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      const result = await service.getTransactionsByUser(getByUserDto);

      expect(result.transactions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should calculate pagination correctly', async () => {
      const page2Dto = {
        userId: 'user-sender-123',
        page: 2,
        limit: 5,
      };

      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrisma.transaction.count.mockResolvedValue(12);

      const result = await service.getTransactionsByUser(page2Dto);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page 2 - 1) * limit 5
          take: 5,
        })
      );
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });

    it('should order transactions by createdAt desc', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      await service.getTransactionsByUser(getByUserDto);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });
});
