/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../common/services/prisma.service';
import { S3Service } from '../../../common/services/s3.service';
import { RedisService } from '../../../common/services/redis.service';
import {
  mockUser,
  mockBankingDetails,
  mockLogger,
  createMockPrismaService,
  createMockRedisService,
  createMockS3Service,
  createMockClientProxy,
} from './test-helpers';

describe('UsersService - Cache Operations', () => {
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

  describe('getUserById - Cache Behavior', () => {
    const userId = mockUser.id;
    const getUserByIdDto = { userId };

    it('should return cached user if available (Cache HIT)', async () => {
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;

      redisService.get.mockResolvedValue(userWithoutPassword);

      const result = await service.getUserById(getUserByIdDto);

      expect(result).toEqual(userWithoutPassword);
      expect(redisService.get).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`✅ Cache HIT for user: ${userId}`);
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache (Cache MISS)', async () => {
      const userWithBanking = {
        ...mockUser,
        bankingDetails: mockBankingDetails,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(userWithBanking);

      const result = await service.getUserById(getUserByIdDto);

      expect(redisService.get).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `❌ Cache MISS for user: ${userId} - Fetching from database`
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { bankingDetails: true },
      });

      const { password, ...expectedUser } = userWithBanking;
      expect(result).toEqual(expectedUser);
      expect(redisService.set).toHaveBeenCalledWith(`user:${userId}`, expectedUser, expect.any(Number));
    });
  });

  describe('getUserTransactionBalance - Cache Behavior', () => {
    const userId = mockUser.id;

    it('should return cached balance if available (Cache HIT)', async () => {
      const cachedBalance = { balance: 1500.0 };

      redisService.get.mockResolvedValue(cachedBalance);

      const result = await service.getUserTransactionBalance(userId);

      expect(result).toEqual(cachedBalance);
      expect(redisService.get).toHaveBeenCalledWith(`user_transaction_balance:${userId}`);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `✅ Cache HIT for transaction balance of user: ${userId}`
      );
      expect(prismaService.bankingDetails.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache (Cache MISS)', async () => {
      const banking = {
        balance: 1000.0,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.bankingDetails.findUnique.mockResolvedValue(banking);

      const result = await service.getUserTransactionBalance(userId);

      expect(result).toEqual({
        balance: 1000.0,
      });
      expect(redisService.get).toHaveBeenCalledWith(`user_transaction_balance:${userId}`);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `❌ Cache MISS for transaction balance of user: ${userId} - Fetching from database`
      );
      expect(prismaService.bankingDetails.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(redisService.set).toHaveBeenCalledWith(
        `user_transaction_balance:${userId}`,
        { balance: 1000.0 },
        expect.any(Number)
      );
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate user cache after update', async () => {
      const updateDto = {
        userId: mockUser.id,
        name: 'Updated Name',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({ ...mockUser, name: 'Updated Name' });

      await service.updateUser(updateDto);

      expect(redisService.del).toHaveBeenCalledWith(`user:${updateDto.userId}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`🗑️  Cache invalidated for user: ${updateDto.userId}`);
    });

    it('should invalidate user cache after profile picture upload', async () => {
      const uploadDto = {
        userId: mockUser.id,
        file: {
          originalname: 'profile.jpg',
          buffer: { data: Array.from(Buffer.from('test')) },
          mimetype: 'image/jpeg',
          size: 4,
        },
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      s3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/bucket/profile.jpg');
      prismaService.user.update.mockResolvedValue(mockUser);

      await service.uploadProfilePicture(uploadDto);

      expect(redisService.del).toHaveBeenCalledWith(`user:${uploadDto.userId}`);
    });

    it('should invalidate both user and balance cache after transaction', async () => {
      const processBalanceDto = {
        transactionId: '123e4567-e89b-12d3-a456-426614174002',
        senderId: '123e4567-e89b-12d3-a456-426614174000',
        receiverId: '123e4567-e89b-12d3-a456-426614174001',
        totalAmount: 100,
        netAmount: 99,
      };

      const senderBanking = {
        userId: processBalanceDto.senderId,
        balance: 1000,
        user: { name: 'John Doe', email: 'john@example.com' },
      };

      const receiverBanking = {
        userId: processBalanceDto.receiverId,
        balance: 500,
        user: { name: 'Jane Doe', email: 'jane@example.com' },
      };

      prismaService.balanceHistory.findFirst.mockResolvedValue(null);
      prismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          bankingDetails: {
            findUnique: jest
              .fn()
              .mockResolvedValueOnce(senderBanking)
              .mockResolvedValueOnce(receiverBanking),
            update: jest.fn().mockResolvedValue({}),
          },
          balanceHistory: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      await service.processTransactionBalance(processBalanceDto);

      // Deve invalidar cache de 2 usuários + 2 saldos = 4 chamadas
      expect(redisService.del).toHaveBeenCalledTimes(4);
      expect(redisService.del).toHaveBeenCalledWith(`user:${processBalanceDto.senderId}`);
      expect(redisService.del).toHaveBeenCalledWith(`user:${processBalanceDto.receiverId}`);
      expect(redisService.del).toHaveBeenCalledWith(
        `user_transaction_balance:${processBalanceDto.senderId}`
      );
      expect(redisService.del).toHaveBeenCalledWith(
        `user_transaction_balance:${processBalanceDto.receiverId}`
      );
    });
  });
});
