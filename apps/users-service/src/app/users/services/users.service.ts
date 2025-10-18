import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../common/services/prisma.service';
import { S3Service } from '../../common/services/s3.service';
import { RedisService } from '../../common/services/redis.service';
import {
  GetUserByIdDto,
  UpdateUserDto,
  UpdateProfilePictureDto,
  ProcessTransactionBalanceDto,
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

  /**
   * Processa transação de saldo (débito do sender e crédito do receiver)
   * IDEMPOTENTE - Usa transactionId para evitar processamento duplicado
   * TRANSACIONAL - Usa transaction do Prisma para garantir atomicidade
   */
  async processTransactionBalance(data: ProcessTransactionBalanceDto & { transactionId?: string }) {
    const { senderId, receiverId, totalAmount, netAmount, transactionId } = data;

    this.logger.log(
      `Processing transaction balance: ${senderId} -> ${receiverId} (Total: ${totalAmount}, Net: ${netAmount})`
    );

    // Idempotência: verificar se a transação já foi processada
    if (transactionId) {
      const existingHistory = await this.prisma.balanceHistory.findFirst({
        where: { transactionId },
      });

      if (existingHistory) {
        this.logger.warn(`Transaction ${transactionId} already processed - skipping`);
        return {
          success: true,
          message: 'Transaction already processed',
          alreadyProcessed: true,
        };
      }
    }

    try {
      // Usar transação do Prisma para garantir atomicidade
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Buscar dados bancários do sender
        const senderBanking = await tx.bankingDetails.findUnique({
          where: { userId: senderId },
        });

        if (!senderBanking) {
          throw new NotFoundException(`Banking details not found for sender ${senderId}`);
        }

        // 2. Validar saldo suficiente
        const senderBalance = Number(senderBanking.balance);
        if (senderBalance < totalAmount) {
          this.logger.warn(
            `Insufficient balance for sender ${senderId}: ${senderBalance} < ${totalAmount}`
          );
          return {
            success: false,
            message: 'Insufficient balance',
            currentBalance: senderBalance,
            requiredAmount: totalAmount,
          };
        }

        // 3. Buscar dados bancários do receiver
        const receiverBanking = await tx.bankingDetails.findUnique({
          where: { userId: receiverId },
        });

        if (!receiverBanking) {
          throw new NotFoundException(`Banking details not found for receiver ${receiverId}`);
        }

        const receiverBalance = Number(receiverBanking.balance);

        // 4. Debitar do sender (valor total com taxa)
        const newSenderBalance = senderBalance - totalAmount;
        await tx.bankingDetails.update({
          where: { userId: senderId },
          data: { balance: newSenderBalance },
        });

        // 5. Creditar ao receiver (valor líquido sem taxa)
        const newReceiverBalance = receiverBalance + netAmount;
        await tx.bankingDetails.update({
          where: { userId: receiverId },
          data: { balance: newReceiverBalance },
        });

        // 6. Registrar histórico de débito do sender
        await tx.balanceHistory.create({
          data: {
            userId: senderId,
            transactionId,
            previousBalance: senderBalance,
            newBalance: newSenderBalance,
            amount: -totalAmount, // Negativo para débito
            type: 'DEBIT',
            description: `Débito referente à transação ${transactionId || 'N/A'}`,
          },
        });

        // 7. Registrar histórico de crédito do receiver
        await tx.balanceHistory.create({
          data: {
            userId: receiverId,
            transactionId,
            previousBalance: receiverBalance,
            newBalance: newReceiverBalance,
            amount: netAmount, // Positivo para crédito
            type: 'CREDIT',
            description: `Crédito referente à transação ${transactionId || 'N/A'}`,
          },
        });

        this.logger.log(
          `✅ Transaction processed successfully: ${senderId} (${senderBalance} -> ${newSenderBalance}) | ${receiverId} (${receiverBalance} -> ${newReceiverBalance})`
        );

        return {
          success: true,
          message: 'Balance updated successfully',
          senderPreviousBalance: senderBalance,
          senderNewBalance: newSenderBalance,
          receiverPreviousBalance: receiverBalance,
          receiverNewBalance: newReceiverBalance,
        };
      });

      // 8. Invalidar cache dos usuários E saldos após atualização
      await Promise.all([
        this.redis.del(this.getCacheKey(senderId)),
        this.redis.del(this.getCacheKey(receiverId)),
        this.redis.del(`user_transaction_balance:${senderId}`),
        this.redis.del(`user_transaction_balance:${receiverId}`),
      ]);
      this.logger.log(`🗑️  Cache invalidated for users and balances: ${senderId}, ${receiverId}`);

      // 9. Emitir eventos de notificação
      this.notificationsClient.emit('notifications.balance.updated', {
        userId: senderId,
        type: 'DEBIT',
        amount: totalAmount,
        newBalance: result.senderNewBalance,
        transactionId,
        timestamp: new Date().toISOString(),
      });

      this.notificationsClient.emit('notifications.balance.updated', {
        userId: receiverId,
        type: 'CREDIT',
        amount: netAmount,
        newBalance: result.receiverNewBalance,
        transactionId,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.logger.error('Error processing transaction balance:', error);
      throw error;
    }
  }

  /**
   * Obtém o saldo de transações de um usuário (saldo bancário)
   * COM CACHE
   */
  async getUserTransactionBalance(userId: string) {
    const cacheKey = `user_transaction_balance:${userId}`;

    // 1. Tentar buscar no cache
    const cachedBalance = await this.redis.get(cacheKey);
    if (cachedBalance) {
      this.logger.log(`✅ Cache HIT for transaction balance of user: ${userId}`);
      return cachedBalance;
    }

    this.logger.log(`❌ Cache MISS for transaction balance of user: ${userId} - Fetching from database`);

    // 2. Buscar no banco de dados
    const bankingDetails = await this.prisma.bankingDetails.findUnique({
      where: { userId },
    });

    if (!bankingDetails) {
      throw new NotFoundException(`Banking details not found for user ${userId}`);
    }

    const balance = { balance: Number(bankingDetails.balance) };

    // 3. Armazenar no cache
    await this.redis.set(cacheKey, balance, this.CACHE_TTL);

    return balance;
  }

  /**
   * Busca um usuário por email
   * Usado para autenticação - RETORNA A SENHA
   */
  async getUserByEmail(email: string) {
    this.logger.log(`Fetching user by email: ${email}`);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        bankingDetails: true,
      },
    });

    if (!user) {
      return null; // Não lança erro para não dar dicas se o email existe
    }

    return user; // Retorna com senha para validação
  }

  /**
   * Cria um novo usuário
   * Usado para registro
   */
  async createUser(data: any) {
    this.logger.log(`Creating new user: ${data.email}`);

    // Criar usuário e dados bancários em uma transação
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password, // Já vem hasheado do auth.service
        address: data.address,
        profilePicture: data.profilePicture,
        bankingDetails: data.bankingDetails
          ? {
              create: {
                agency: data.bankingDetails.agency,
                accountNumber: data.bankingDetails.accountNumber,
                balance: 0, // Saldo inicial zero
              },
            }
          : undefined,
      },
      include: {
        bankingDetails: true,
      },
    });

    // Remove a senha antes de retornar
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    // Emitir evento de novo usuário para notifications
    this.notificationsClient.emit('notifications.user.created', {
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return userWithoutPassword;
  }
}
