import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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

describe('UsersService - CRUD Operations', () => {
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

  describe('getUserById', () => {
    const userId = mockUser.id;
    const getUserByIdDto = { userId };

    it('should return user with banking details', async () => {
      const userWithBanking = {
        ...mockUser,
        bankingDetails: mockBankingDetails,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(userWithBanking);

      const result = await service.getUserById(getUserByIdDto);

      const { password, ...expectedUser } = userWithBanking;
      expect(result).toEqual(expectedUser);
      expect(result).toHaveProperty('bankingDetails');
    });

    it('should throw NotFoundException if user not found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById(getUserByIdDto)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found`)
      );
    });

    it('should exclude password from returned user data', async () => {
      const userWithBanking = {
        ...mockUser,
        bankingDetails: mockBankingDetails,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(userWithBanking);

      const result = await service.getUserById(getUserByIdDto);

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
    });
  });

  describe('updateUser', () => {
    const updateUserDto = {
      userId: mockUser.id,
      name: 'Jane Doe',
      email: 'jane@example.com',
      address: '456 Oak Ave',
    };

    it('should update user successfully with all fields', async () => {
      const updatedUser = {
        ...mockUser,
        ...updateUserDto,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(updateUserDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: updateUserDto.userId },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: updateUserDto.userId },
        data: {
          name: updateUserDto.name,
          email: updateUserDto.email,
          address: updateUserDto.address,
        },
        include: { bankingDetails: true },
      });
      expect(redisService.del).toHaveBeenCalledWith(`user:${updateUserDto.userId}`);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUser(updateUserDto)).rejects.toThrow(
        new NotFoundException(`User with ID ${updateUserDto.userId} not found`)
      );
      expect(prismaService.user.update).not.toHaveBeenCalled();
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('should update only provided fields (partial update)', async () => {
      const partialUpdateDto = {
        userId: mockUser.id,
        name: 'Jane Doe',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({ ...mockUser, name: 'Jane Doe' });

      await service.updateUser(partialUpdateDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: partialUpdateDto.userId },
        data: { name: 'Jane Doe' },
        include: { bankingDetails: true },
      });
    });

    it('should handle updating address to null', async () => {
      const updateWithNullDto = {
        userId: mockUser.id,
        address: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({ ...mockUser, address: null });

      await service.updateUser(updateWithNullDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: updateWithNullDto.userId },
        data: { address: null },
        include: { bankingDetails: true },
      });
    });
  });

  describe('getUserByEmail', () => {
    const email = 'john@example.com';

    it('should return user by email successfully with password', async () => {
      const userWithBanking = {
        ...mockUser,
        bankingDetails: mockBankingDetails,
      };

      prismaService.user.findUnique.mockResolvedValue(userWithBanking);

      const result = await service.getUserByEmail(email);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { bankingDetails: true },
      });
      expect(result).toEqual(userWithBanking);
      expect(result).toHaveProperty('password'); // Para autenticação
    });

    it('should return null if user not found (not throw exception for security)', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserByEmail(email);

      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { bankingDetails: true },
      });
    });

    it('should include banking details in response', async () => {
      const userWithBanking = {
        ...mockUser,
        bankingDetails: mockBankingDetails,
      };

      prismaService.user.findUnique.mockResolvedValue(userWithBanking);

      const result = await service.getUserByEmail(email);

      expect(result).toHaveProperty('bankingDetails');
      expect(result.bankingDetails).toEqual(mockBankingDetails);
    });
  });

  describe('getUserTransactionBalance', () => {
    const userId = mockUser.id;

    it('should return user balance from database', async () => {
      const banking = {
        balance: 1000.0,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.bankingDetails.findUnique.mockResolvedValue(banking);

      const result = await service.getUserTransactionBalance(userId);

      expect(result).toEqual({
        balance: 1000.0,
      });
      expect(prismaService.bankingDetails.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should throw NotFoundException if banking details not found', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.bankingDetails.findUnique.mockResolvedValue(null);

      await expect(service.getUserTransactionBalance(userId)).rejects.toThrow(
        new NotFoundException(`Banking details not found for user ${userId}`)
      );
    });

    it('should handle zero balance correctly', async () => {
      const banking = {
        balance: 0,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.bankingDetails.findUnique.mockResolvedValue(banking);

      const result = await service.getUserTransactionBalance(userId);

      expect(result).toEqual({
        balance: 0,
      });
    });

    it('should convert Decimal balance to Number', async () => {
      const banking = {
        balance: 1234.56,
      };

      redisService.get.mockResolvedValue(null);
      prismaService.bankingDetails.findUnique.mockResolvedValue(banking);

      const result = await service.getUserTransactionBalance(userId);

      expect(typeof (result as { balance: number }).balance).toBe('number');
      expect((result as { balance: number }).balance).toBe(1234.56);
    });
  });
});
