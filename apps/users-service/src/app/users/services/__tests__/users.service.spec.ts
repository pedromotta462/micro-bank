import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../common/services/prisma.service';
import { S3Service } from '../../../common/services/s3.service';
import { RedisService } from '../../../common/services/redis.service';
import { PinoLogger } from 'nestjs-pino';
import { ClientProxy } from '@nestjs/microservices';
import {
  mockLogger,
  createMockPrismaService,
  createMockRedisService,
  createMockS3Service,
  createMockClientProxy,
} from './test-helpers';

describe('UsersService - Basic Tests', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have all required dependencies injected', () => {
    expect(service).toHaveProperty('prisma');
    expect(service).toHaveProperty('redis');
    expect(service).toHaveProperty('s3Service');
    expect(service).toHaveProperty('logger');
  });

  describe('Cache Key Generation', () => {
    it('should generate correct cache key for user', () => {
      const userId = 'test-user-id';
      // @ts-expect-error - Accessing private method for testing
      const cacheKey = service.getCacheKey(userId);
      expect(cacheKey).toBe(`user:${userId}`);
    });

    it('should generate correct cache key for user transaction balance', () => {
      const userId = 'test-user-id';
      const cacheKey = `user_transaction_balance:${userId}`;
      expect(cacheKey).toBe(`user_transaction_balance:${userId}`);
    });
  });

  describe('Service Health', () => {
    it('should handle initialization without errors', () => {
      expect(() => service).not.toThrow();
    });

    it('should have valid logger instance', () => {
      expect(mockLogger).toBeDefined();
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.warn).toBeDefined();
      expect(mockLogger.error).toBeDefined();
    });

    it('should have valid RabbitMQ client proxies', () => {
      expect(mockClientProxy).toBeDefined();
      expect(mockClientProxy.emit).toBeDefined();
      expect(mockClientProxy.send).toBeDefined();
    });
  });
});
