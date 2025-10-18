import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TransactionsService } from '../services/transactions.service';
import {
  CreateTransactionDto,
  GetTransactionByIdDto,
  GetTransactionsByUserDto,
  createTransactionDtoSchema,
  getTransactionByIdDtoSchema,
  getTransactionsByUserDtoSchema,
} from '../dtos';

/**
 * Controller que recebe mensagens do RabbitMQ para operações de transações
 */
@Controller()
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Handler: Criar nova transação
   */
  @MessagePattern({ cmd: 'create_transaction' })
  async createTransaction(@Payload() data: unknown) {
    this.logger.log('Received create_transaction command');

    // Validação com Zod
    const validation = createTransactionDtoSchema.safeParse(data);
    if (!validation.success) {
      this.logger.error(
        `Validation error: ${JSON.stringify(validation.error.issues)}`
      );
      throw new Error(
        `Validation failed: ${validation.error.issues
          .map((e) => e.message)
          .join(', ')}`
      );
    }

    const dto: CreateTransactionDto = validation.data;
    return this.transactionsService.createTransaction(dto);
  }

  /**
   * Handler: Obter transação por ID
   */
  @MessagePattern({ cmd: 'get_transaction_by_id' })
  async getTransactionById(@Payload() data: unknown) {
    this.logger.log('Received get_transaction_by_id command');

    // Validação com Zod
    const validation = getTransactionByIdDtoSchema.safeParse(data);
    if (!validation.success) {
      this.logger.error(
        `Validation error: ${JSON.stringify(validation.error.issues)}`
      );
      throw new Error(
        `Validation failed: ${validation.error.issues
          .map((e) => e.message)
          .join(', ')}`
      );
    }

    const dto: GetTransactionByIdDto = validation.data;
    return this.transactionsService.getTransactionById(dto);
  }

  /**
   * Handler: Obter transações de um usuário
   */
  @MessagePattern({ cmd: 'get_transactions_by_user' })
  async getTransactionsByUser(@Payload() data: unknown) {
    this.logger.log('Received get_transactions_by_user command');

    // Validação com Zod
    const validation = getTransactionsByUserDtoSchema.safeParse(data);
    if (!validation.success) {
      this.logger.error(
        `Validation error: ${JSON.stringify(validation.error.issues)}`
      );
      throw new Error(
        `Validation failed: ${validation.error.issues
          .map((e) => e.message)
          .join(', ')}`
      );
    }

    const dto: GetTransactionsByUserDto = validation.data;
    return this.transactionsService.getTransactionsByUser(dto);
  }
}
