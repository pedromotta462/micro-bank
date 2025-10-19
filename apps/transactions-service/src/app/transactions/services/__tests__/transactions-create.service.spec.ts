import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TransactionsService } from '../transactions.service';
import { of } from 'rxjs';
import {
  mockTransaction,
  mockLogger,
  mockUserValidationResponse,
  createMockPrismaClient,
  createMockUsersClient,
  createMockNotificationsClient,
} from './test-helpers';

describe('TransactionsService - Create Operations', () => {
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
    // Substituir o prisma interno pelo mock
    (service as any).prisma = mockPrisma;

    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    const createTransactionDto = {
      senderUserId: 'user-sender-123',
      receiverUserId: 'user-receiver-456',
      amount: 100.0,
      description: 'Payment for services',
      type: 'TRANSFER' as const,
      externalId: 'ext-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should create a transaction successfully', async () => {
      // Mock: Validação de usuários
      mockUsersClient.send.mockReturnValue(of(mockUserValidationResponse));

      // Mock: Criação da transação
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);

      // Mock: Criação do evento
      mockPrisma.transactionEvent.create.mockResolvedValue({
        id: 'event-123',
        transactionId: mockTransaction.id,
      });

      const result = await service.createTransaction(createTransactionDto);

      expect(result).toEqual(mockTransaction);
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          senderUserId: createTransactionDto.senderUserId,
          receiverUserId: createTransactionDto.receiverUserId,
          amount: createTransactionDto.amount,
          fee: expect.any(Number),
          totalAmount: expect.any(Number),
          status: 'PENDING',
        }),
      });
      expect(mockPrisma.transactionEvent.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if sender and receiver are the same', async () => {
      const sameUserDto = {
        ...createTransactionDto,
        receiverUserId: createTransactionDto.senderUserId,
      };

      await expect(service.createTransaction(sameUserDto)).rejects.toThrow(
        new BadRequestException('Não é possível transferir para a mesma conta')
      );

      expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
    });

    it('should calculate fee correctly for TRANSFER type (1%)', async () => {
      mockUsersClient.send.mockReturnValue(of(mockUserValidationResponse));
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);
      mockPrisma.transactionEvent.create.mockResolvedValue({ id: 'event-123' });

      await service.createTransaction(createTransactionDto);

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 100.0,
          fee: 1.0, // 1% de 100
          totalAmount: 101.0,
        }),
      });
    });

    it('should calculate fee correctly for PIX type (0%)', async () => {
      const pixDto = {
        ...createTransactionDto,
        type: 'PIX' as const,
      };

      mockUsersClient.send.mockReturnValue(of(mockUserValidationResponse));
      mockPrisma.transaction.create.mockResolvedValue({
        ...mockTransaction,
        type: 'PIX',
        fee: 0,
        totalAmount: 100.0,
      });
      mockPrisma.transactionEvent.create.mockResolvedValue({ id: 'event-123' });

      await service.createTransaction(pixDto);

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 100.0,
          fee: 0, // 0% para PIX
          totalAmount: 100.0,
        }),
      });
    });

    it('should create PENDING status initially', async () => {
      mockUsersClient.send.mockReturnValue(of(mockUserValidationResponse));
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);
      mockPrisma.transactionEvent.create.mockResolvedValue({ id: 'event-123' });

      const result = await service.createTransaction(createTransactionDto);

      expect(result.status).toBe('PENDING');
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING',
        }),
      });
    });

    it('should handle large transaction amounts correctly', async () => {
      const largeAmountDto = {
        ...createTransactionDto,
        amount: 999999.99,
      };

      mockUsersClient.send.mockReturnValue(of(mockUserValidationResponse));
      mockPrisma.transaction.create.mockResolvedValue({
        ...mockTransaction,
        amount: 999999.99,
        fee: 9999.9999,
        totalAmount: 1009999.99,
      });
      mockPrisma.transactionEvent.create.mockResolvedValue({ id: 'event-123' });

      const result = await service.createTransaction(largeAmountDto);

      expect(result.amount).toBe(999999.99);
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 999999.99,
        }),
      });
    });
  });
});
