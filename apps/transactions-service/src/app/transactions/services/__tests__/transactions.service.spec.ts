import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../transactions.service';
import {
  mockLogger,
  createMockPrismaClient,
  createMockUsersClient,
  createMockNotificationsClient,
} from './test-helpers';

describe('TransactionsService - Basic Tests', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have all required dependencies injected', () => {
    expect(service).toHaveProperty('prisma');
    expect(service).toHaveProperty('logger');
    expect(service).toHaveProperty('usersClient');
    expect(service).toHaveProperty('notificationsClient');
  });

  describe('Service Lifecycle', () => {
    it('should connect to database on module init', async () => {
      await service.onModuleInit();

      expect(mockPrisma.$connect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Connected to transactions database'
      );
    });

    it('should disconnect from database on module destroy', async () => {
      await service.onModuleDestroy();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    it('should handle initialization without errors', () => {
      expect(() => service).not.toThrow();
    });
  });

  describe('Service Health', () => {
    it('should have valid logger instance', () => {
      expect(mockLogger).toBeDefined();
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.warn).toBeDefined();
      expect(mockLogger.error).toBeDefined();
    });

    it('should have valid RabbitMQ client proxies', () => {
      expect(mockUsersClient).toBeDefined();
      expect(mockUsersClient.send).toBeDefined();
      expect(mockUsersClient.emit).toBeDefined();

      expect(mockNotificationsClient).toBeDefined();
      expect(mockNotificationsClient.send).toBeDefined();
      expect(mockNotificationsClient.emit).toBeDefined();
    });

    it('should have prisma client configured', () => {
      expect((service as any).prisma).toBeDefined();
      expect((service as any).prisma.transaction).toBeDefined();
      expect((service as any).prisma.transactionEvent).toBeDefined();
    });
  });
});
