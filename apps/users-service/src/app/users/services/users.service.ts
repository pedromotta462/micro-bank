import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../common/services/prisma.service';
import { S3Service } from '../../common/services/s3.service';
import { RedisService } from '../../common/services/redis.service';
import {
  GetUserByIdDto,
  UpdateUserDto,
  UpdateProfilePictureDto,
} from '../dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly CACHE_PREFIX = 'user:';
  private readonly CACHE_TTL = parseInt(process.env.REDIS_USER_TTL || '3600', 10); // 1 hora

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly redis: RedisService,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Inject('TRANSACTIONS_SERVICE_CLIENT') private readonly transactionsClient: ClientProxy,
    @Inject('NOTIFICATIONS_SERVICE_CLIENT') private readonly notificationsClient: ClientProxy
  ) {}

  /**
   * Gera a chave de cache para um usuário
   */
  private getCacheKey(userId: string): string {
    return `${this.CACHE_PREFIX}${userId}`;
  }

  /**
   * Busca um usuário por ID incluindo seus dados bancários
   * COM CACHE
   */
  async getUserById(data: GetUserByIdDto) {
    const cacheKey = this.getCacheKey(data.userId);

    // 1. Tentar buscar no cache
    const cachedUser = await this.redis.get(cacheKey);
    if (cachedUser) {
      this.logger.log(`✅ Cache HIT for user: ${data.userId}`);
      return cachedUser;
    }

    this.logger.log(`❌ Cache MISS for user: ${data.userId} - Fetching from database`);

    // 2. Buscar no banco de dados
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      include: {
        bankingDetails: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;     // Remove sensitive data

    // 3. Armazenar no cache
    await this.redis.set(cacheKey, userWithoutPassword, this.CACHE_TTL);

    return userWithoutPassword;
  }

  /**
   * Atualiza dados de um usuário (parcial)
   * INVALIDA CACHE
   */
  async updateUser(data: UpdateUserDto) {
    this.logger.log(`Updating user: ${data.userId}`);

    // Verificar se o usuário existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;

    // Atualizar usuário
    const updatedUser = await this.prisma.user.update({
      where: { id: data.userId },
      data: updateData,
      include: {
        bankingDetails: true,
      },
    });

    // Se houver dados bancários para atualizar
    if (data.bankingDetails && updatedUser.bankingDetails) {
      const bankingUpdateData: any = {};

      if (data.bankingDetails.agency !== undefined) {
        bankingUpdateData.agency = data.bankingDetails.agency;
      }
      if (data.bankingDetails.accountNumber !== undefined) {
        bankingUpdateData.accountNumber = data.bankingDetails.accountNumber;
      }

      if (Object.keys(bankingUpdateData).length > 0) {
        await this.prisma.bankingDetails.update({
          where: { userId: data.userId },
          data: bankingUpdateData,
        });

        // Recarregar usuário com dados bancários atualizados
        const finalUser = await this.prisma.user.findUnique({
          where: { id: data.userId },
          include: {
            bankingDetails: true,
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = finalUser;

        // Invalidar cache após atualização
        await this.redis.del(this.getCacheKey(data.userId));
        this.logger.log(`🗑️  Cache invalidated for user: ${data.userId}`);

        // Publicar evento de notificação
        this.notificationsClient.emit(
          'notifications.user.updated',
          {
            userId: data.userId,
            timestamp: new Date().toISOString(),
          }
        );
        this.logger.log(`📨 Notification event emitted for user update: ${data.userId}`);

        return userWithoutPassword;
      }
    }

    // Remove sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;

    // Invalidar cache após atualização
    await this.redis.del(this.getCacheKey(data.userId));
    this.logger.log(`🗑️  Cache invalidated for user: ${data.userId}`);

    return userWithoutPassword;
  }

  /**
   * Faz upload da foto de perfil no S3 e atualiza o usuário
   * INVALIDA CACHE
   */
  async uploadProfilePicture(data: UpdateProfilePictureDto) {
    const { userId, file } = data;

    this.logger.log(`Uploading profile picture for user: ${userId} to S3`);

    // Verificar se o usuário existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Reconstituir o arquivo do buffer
    const fileBuffer = Buffer.from(file.buffer.data);
    const fileObject = {
      buffer: fileBuffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    } as any;

    // Fazer upload no S3
    const s3Url = await this.s3Service.uploadFile(fileObject, userId);

    // Atualizar foto de perfil no banco
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        profilePicture: s3Url,
      },
    });

    // Invalidar cache após atualização
    await this.redis.del(this.getCacheKey(userId));
    this.logger.log(`🗑️  Cache invalidated for user: ${userId}`);

    return {
      profilePicture: s3Url,
    };
  }
}
