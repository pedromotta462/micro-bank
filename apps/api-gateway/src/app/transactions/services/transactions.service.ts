import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  CreateTransactionDto,
  TransactionResponseDto,
  TransactionsListResponseDto,
  GetTransactionsQueryDto,
} from '../dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @Inject('TRANSACTIONS_SERVICE_CLIENT')
    private readonly transactionsClient: ClientProxy
  ) {}

  /**
   * Cria uma nova transação
   */
  async createTransaction(
    userId: string,
    createTransactionDto: CreateTransactionDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TransactionResponseDto> {
    this.logger.log(`Sending create_transaction message for userId: ${userId}`);

    try {
      const response = await firstValueFrom(
        this.transactionsClient
          .send(
            { cmd: 'create_transaction' },
            {
              senderUserId: userId,
              ...createTransactionDto,
              ipAddress,
              userAgent,
            }
          )
          .pipe(timeout(10000)) // 10s para criar transação
      );

      this.logger.log(
        `Transaction created successfully: ${response.id} for user ${userId}`
      );
      
      return response;
    } catch (error) {
      this.logger.error(
        `Error communicating with transactions-service for create transaction userId ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Obtém detalhes de uma transação específica pelo ID
   */
  async getTransactionById(
    transactionId: string
  ): Promise<TransactionResponseDto> {
    this.logger.log(
      `Sending get_transaction_by_id message for transactionId: ${transactionId}`
    );

    try {
      const response = await firstValueFrom(
        this.transactionsClient
          .send({ cmd: 'get_transaction_by_id' }, { transactionId })
          .pipe(timeout(5000))
      );

      this.logger.log(
        `Received transaction data for transactionId: ${transactionId}`
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Error communicating with transactions-service for transactionId ${transactionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Lista todas as transações de um usuário específico
   */
  async getTransactionsByUserId(
    userId: string,
    query: GetTransactionsQueryDto
  ): Promise<TransactionsListResponseDto> {
    this.logger.log(
      `Sending get_transactions_by_user message for userId: ${userId}`
    );

    try {
      const response = await firstValueFrom(
        this.transactionsClient
          .send(
            { cmd: 'get_transactions_by_user' },
            {
              userId,
              ...query,
            }
          )
          .pipe(timeout(10000))
      );

      this.logger.log(
        `Received ${response.transactions?.length || 0} transactions for userId: ${userId}`
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Error communicating with transactions-service for get transactions userId ${userId}:`,
        error
      );
      throw error;
    }
  }
}
