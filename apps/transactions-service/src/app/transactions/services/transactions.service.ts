import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { PrismaClient, TransactionStatus, TransactionType } from '../../../../generated/prisma';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  CreateTransactionDto,
  GetTransactionByIdDto,
  GetTransactionsByUserDto,
} from '../dtos';

@Injectable()
export class TransactionsService {
  private readonly prisma: PrismaClient;

  constructor(
    @InjectPinoLogger(TransactionsService.name)
    private readonly logger: PinoLogger,
    @Inject('USERS_SERVICE_CLIENT')
    private readonly usersClient: ClientProxy,
    @Inject('NOTIFICATIONS_SERVICE_CLIENT')
    private readonly notificationsClient: ClientProxy
  ) {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    await this.prisma.$connect();
    this.logger.info('✅ Connected to transactions database');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  /**
   * Cria uma nova transação
   */
  async createTransaction(data: CreateTransactionDto) {
    this.logger.info(
      `Creating transaction from ${data.senderUserId} to ${data.receiverUserId}`
    );

    // Validação: não permitir transferência para si mesmo
    if (data.senderUserId === data.receiverUserId) {
      throw new BadRequestException(
        'Não é possível transferir para a mesma conta'
      );
    }

    try {
      // 1. Validar existência dos usuários
      await this.validateUsers(data.senderUserId, data.receiverUserId);

      // 2. Calcular taxa (exemplo: 1% para transferências, 0% para PIX)
      const fee = this.calculateFee(data.amount, data.type);
      const totalAmount = data.amount + fee;

      // 3. Criar transação como PENDING
      const transaction = await this.prisma.transaction.create({
        data: {
          senderUserId: data.senderUserId,
          receiverUserId: data.receiverUserId,
          amount: data.amount,
          fee,
          totalAmount,
          description: data.description,
          type: data.type as TransactionType,
          status: TransactionStatus.PENDING,
          externalId: data.externalId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      // 4. Registrar evento de criação
      await this.createTransactionEvent(
        transaction.id,
        'CREATED',
        null,
        TransactionStatus.PENDING,
        'Transação criada e aguardando processamento'
      );

      this.logger.info(`Transaction ${transaction.id} created successfully`);

      // 5. Processar transação de forma assíncrona
      this.processTransaction(transaction.id).catch((error) => {
        this.logger.error(
          `Error processing transaction ${transaction.id}:`,
          error
        );
      });

      return transaction;
    } catch (error) {
      this.logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Processa a transação (validação de saldo e atualização)
   */
  private async processTransaction(transactionId: string) {
    this.logger.info(`Processing transaction ${transactionId}`);

    try {
      // Atualizar status para PROCESSING
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.PROCESSING },
      });

      await this.createTransactionEvent(
        transactionId,
        'PROCESSING_STARTED',
        TransactionStatus.PENDING,
        TransactionStatus.PROCESSING,
        'Processamento da transação iniciado'
      );

      const transaction = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      // Validar e atualizar saldo do remetente via users-service
      const balanceValidated = await this.validateAndUpdateBalance(
        transaction.id,
        transaction.senderUserId,
        transaction.receiverUserId,
        Number(transaction.totalAmount),
        Number(transaction.amount)
      );

      if (!balanceValidated) {
        // Falha na validação de saldo
        await this.failTransaction(transactionId, 'Saldo insuficiente');
        return;
      }

      // Transação concluída com sucesso
      const completedTransaction = await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await this.createTransactionEvent(
        transactionId,
        'COMPLETED',
        TransactionStatus.PROCESSING,
        TransactionStatus.COMPLETED,
        'Transação concluída com sucesso'
      );

      // Emitir evento para notifications-service
      this.emitNotificationEvent(completedTransaction, 'TRANSACTION_COMPLETED');

      this.logger.info(`Transaction ${transactionId} completed successfully`);
    } catch (error) {
      this.logger.error(`Error processing transaction ${transactionId}:`, error);
      await this.failTransaction(
        transactionId,
        'Erro ao processar transação'
      );
    }
  }

  /**
   * Marca transação como falhada
   */
  private async failTransaction(transactionId: string, reason: string) {
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.FAILED,
        failureReason: reason,
      },
    });

    await this.createTransactionEvent(
      transactionId,
      'FAILED',
      TransactionStatus.PROCESSING,
      TransactionStatus.FAILED,
      reason
    );

    const failedTransaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    // Emitir evento para notifications-service
    if (failedTransaction) {
      this.emitNotificationEvent(failedTransaction, 'TRANSACTION_FAILED');
    }

    this.logger.warn(`Transaction ${transactionId} failed: ${reason}`);
  }

  /**
   * Valida existência dos usuários
   */
  private async validateUsers(senderId: string, receiverId: string) {
    try {
      // Validar remetente
      const sender = await firstValueFrom(
        this.usersClient
          .send({ cmd: 'get_user_by_id' }, { userId: senderId })
          .pipe(timeout(5000))
      );

      if (!sender) {
        throw new BadRequestException('Remetente não encontrado');
      }

      // Validar destinatário
      const receiver = await firstValueFrom(
        this.usersClient
          .send({ cmd: 'get_user_by_id' }, { userId: receiverId })
          .pipe(timeout(5000))
      );

      if (!receiver) {
        throw new BadRequestException('Destinatário não encontrado');
      }

      this.logger.info(`Users validated: ${senderId} -> ${receiverId}`);
    } catch (error) {
      this.logger.error('Error validating users:', error);
      throw new BadRequestException('Erro ao validar usuários');
    }
  }

  /**
   * Valida e atualiza saldo via users-service
   */
  private async validateAndUpdateBalance(
    transactionId: string,
    senderId: string,
    receiverId: string,
    totalAmount: number,
    netAmount: number
  ): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.usersClient
          .send(
            { cmd: 'process_transaction_balance' },
            {
              transactionId,
              senderId,
              receiverId,
              totalAmount,
              netAmount,
            }
          )
          .pipe(timeout(10000))
      );

      return result.success;
    } catch (error) {
      this.logger.error('Error validating balance:', error);
      return false;
    }
  }

  /**
   * Calcula taxa da transação
   */
  private calculateFee(amount: number, type: TransactionType): number {
    switch (type) {
      case 'PIX':
        return 0; // PIX sem taxa
      case 'TRANSFER':
        return amount * 0.01; // 1% de taxa
      case 'TED':
        return 10.0; // Taxa fixa de R$10
      case 'DOC':
        return 5.0; // Taxa fixa de R$5
      default:
        return 0;
    }
  }

  /**
   * Obtém transação por ID
   */
  async getTransactionById(data: GetTransactionByIdDto) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: data.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    return transaction;
  }

  /**
   * Lista transações de um usuário
   */
  async getTransactionsByUser(data: GetTransactionsByUserDto) {
    const { userId, page = 1, limit = 10, status, type } = data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      OR: [{ senderUserId: userId }, { receiverUserId: userId }],
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  /**
   * Cria evento de transação para auditoria
   */
  private async createTransactionEvent(
    transactionId: string,
    eventType: string,
    oldStatus: TransactionStatus | null,
    newStatus: TransactionStatus,
    description: string
  ) {
    await this.prisma.transactionEvent.create({
      data: {
        transactionId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventType: eventType as any,
        oldStatus,
        newStatus,
        description,
        performedBy: 'SYSTEM',
      },
    });
  }

  /**
   * Emite evento para notifications-service
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emitNotificationEvent(transaction: any, eventType: string) {
    try {
      this.notificationsClient.emit('transaction_notification', {
        eventType,
        transactionId: transaction.id,
        senderUserId: transaction.senderUserId,
        receiverUserId: transaction.receiverUserId,
        amount: Number(transaction.amount),
        status: transaction.status,
        timestamp: new Date(),
      });

      this.logger.info(
        `Notification event emitted for transaction ${transaction.id}: ${eventType}`
      );
    } catch (error) {
      this.logger.error('Error emitting notification event:', error);
      // Não falhar a transação se a notificação falhar
    }
  }
}
