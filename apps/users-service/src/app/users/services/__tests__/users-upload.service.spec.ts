import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../common/services/prisma.service';
import { S3Service } from '../../../common/services/s3.service';
import { RedisService } from '../../../common/services/redis.service';
import {
  mockUser,
  mockLogger,
  createMockPrismaService,
  createMockRedisService,
  createMockS3Service,
  createMockClientProxy,
} from './test-helpers';

describe('UsersService - Upload Operations', () => {
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

  describe('uploadProfilePicture', () => {
    const userId = mockUser.id;
    const mockBuffer = Buffer.from('fake-image-data');
    const mockFile = {
      originalname: 'profile.jpg',
      buffer: {
        data: Array.from(mockBuffer),
      },
      mimetype: 'image/jpeg',
      size: 1024,
      fieldname: 'file',
      encoding: '7bit',
    };

    it('should upload profile picture successfully', async () => {
      const s3Url = 'https://s3.amazonaws.com/bucket/user-id/profile.jpg';
      const updatedUser = {
        ...mockUser,
        profilePicture: s3Url,
      };

      const updateProfilePictureDto = { userId, file: mockFile };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      s3Service.uploadFile.mockResolvedValue(s3Url);
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.uploadProfilePicture(updateProfilePictureDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: mockFile.originalname,
          mimetype: mockFile.mimetype,
        }),
        userId
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          profilePicture: s3Url,
        },
      });

      expect(redisService.del).toHaveBeenCalledWith(`user:${userId}`);
      expect(result).toEqual({
        profilePicture: s3Url,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateProfilePictureDto = { userId, file: mockFile };

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.uploadProfilePicture(updateProfilePictureDto)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found`)
      );

      expect(s3Service.uploadFile).not.toHaveBeenCalled();
      expect(prismaService.user.update).not.toHaveBeenCalled();
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('should handle S3 upload error gracefully', async () => {
      const s3Error = new Error('S3 upload failed');
      const updateProfilePictureDto = { userId, file: mockFile };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      s3Service.uploadFile.mockRejectedValue(s3Error);

      await expect(service.uploadProfilePicture(updateProfilePictureDto)).rejects.toThrow(s3Error);

      expect(prismaService.user.update).not.toHaveBeenCalled();
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('should handle different image formats (PNG)', async () => {
      const pngFile = {
        ...mockFile,
        originalname: 'profile.png',
        mimetype: 'image/png',
      };

      const updateProfilePictureDto = { userId, file: pngFile };
      const s3Url = 'https://s3.amazonaws.com/bucket/user-id/profile.png';

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      s3Service.uploadFile.mockResolvedValue(s3Url);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        profilePicture: s3Url,
      });

      const result = await service.uploadProfilePicture(updateProfilePictureDto);

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          mimetype: 'image/png',
        }),
        userId
      );

      expect(result.profilePicture).toBe(s3Url);
    });

    it('should replace existing profile picture', async () => {
      const userWithOldPicture = {
        ...mockUser,
        profilePicture: 'https://s3.amazonaws.com/bucket/user-id/old-profile.jpg',
      };

      const updateProfilePictureDto = { userId, file: mockFile };
      const newS3Url = 'https://s3.amazonaws.com/bucket/user-id/new-profile.jpg';

      prismaService.user.findUnique.mockResolvedValue(userWithOldPicture);
      s3Service.uploadFile.mockResolvedValue(newS3Url);
      prismaService.user.update.mockResolvedValue({
        ...userWithOldPicture,
        profilePicture: newS3Url,
      });

      const result = await service.uploadProfilePicture(updateProfilePictureDto);

      expect(result.profilePicture).toBe(newS3Url);
      expect(redisService.del).toHaveBeenCalledWith(`user:${userId}`);
    });
  });
});
