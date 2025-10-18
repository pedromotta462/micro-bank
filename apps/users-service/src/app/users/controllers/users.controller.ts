import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { UsersService } from '../services/users.service';
import {
  GetUserByIdDto,
  UpdateUserDto,
  UpdateProfilePictureDto,
  ProcessTransactionBalanceDto,
} from '../dto';

@Controller()
export class UsersController {
  constructor(
    @InjectPinoLogger(UsersController.name)
    private readonly logger: PinoLogger,
    private readonly usersService: UsersService
  ) {}

  /**
   * Message Pattern: get_user_by_id
   * Retorna os detalhes de um usuário incluindo dados bancários
   */
  @MessagePattern({ cmd: 'get_user_by_id' })
  async getUserById(@Payload() data: GetUserByIdDto) {
    this.logger.info(`Received get_user_by_id message for userId: ${data.userId}`);
    
    try {
      const user = await this.usersService.getUserById(data);
      this.logger.info(`Successfully retrieved user: ${data.userId}`);
      return user;
    } catch (error) {
      this.logger.error(`Error getting user ${data.userId}:`, error);
      throw error;
    }
  }

  /**
   * Message Pattern: update_user
   * Atualiza dados parciais de um usuário
   */
  @MessagePattern({ cmd: 'update_user' })
  async updateUser(@Payload() data: UpdateUserDto) {
    this.logger.info(`Received update_user message for userId: ${data.userId}`);
    
    try {
      const user = await this.usersService.updateUser(data);
      this.logger.info(`Successfully updated user: ${data.userId}`);
      return user;
    } catch (error) {
      this.logger.error(`Error updating user ${data.userId}:`, error);
      throw error;
    }
  }

  /**
   * Message Pattern: upload_profile_picture
   * Faz upload da foto de perfil no S3 e atualiza o usuário
   */
  @MessagePattern({ cmd: 'upload_profile_picture' })
  async uploadProfilePicture(@Payload() data: UpdateProfilePictureDto) {
    this.logger.info(
      `Received upload_profile_picture message for userId: ${data.userId}`
    );
    
    try {
      const result = await this.usersService.uploadProfilePicture(
        data
      );
      this.logger.info(`Successfully uploaded profile picture for user: ${data.userId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error uploading profile picture for user ${data.userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Message Pattern: process_transaction_balance
   * Processa débito/crédito de saldo em uma transação
   * CRÍTICO: Usado pelo transactions-service para atualizar saldos
   */
  @MessagePattern({ cmd: 'process_transaction_balance' })
  async processTransactionBalance(
    @Payload() data: ProcessTransactionBalanceDto
  ) {
    this.logger.info(
      `🔄 Received process_transaction_balance message: ${data.senderId} -> ${data.receiverId} (${data.totalAmount})`
    );
    
    try {
      const result = await this.usersService.processTransactionBalance(data);
      
      if (result.success) {
        this.logger.info(`✅ Balance processed successfully for transaction ${data.transactionId || 'N/A'}`);
      } else {
        this.logger.warn(`⚠️  Balance processing failed: ${result.message}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(
        `❌ Error processing transaction balance:`,
        error
      );
      throw error;
    }
  }

  /**
   * Obtém o saldo de transações de um usuário
   */
  /**
   * Message Pattern: get_user_transaction_balance
   * Retorna o saldo bancário do usuário com cache
   */
  @MessagePattern({ cmd: 'get_user_transaction_balance' })
  async getUserTransactionBalance(@Payload() data: { userId: string }) {
    this.logger.info(`Received get_user_transaction_balance message for userId: ${data.userId}`);

    try {
      const balance = await this.usersService.getUserTransactionBalance(data.userId);
      this.logger.info(`Successfully retrieved transaction balance for user: ${data.userId}`);
      return balance;
    } catch (error) {
      this.logger.error(`Error getting transaction balance for user ${data.userId}:`, error);
      throw error;
    }
  }

  /**
   * Message Pattern: get_user_by_email
   * Busca um usuário por email (usado para autenticação)
   */
  @MessagePattern({ cmd: 'get_user_by_email' })
  async getUserByEmail(@Payload() data: { email: string }) {
    this.logger.info(`Received get_user_by_email message for email: ${data.email}`);

    try {
      const user = await this.usersService.getUserByEmail(data.email);
      this.logger.info(`Successfully retrieved user by email: ${data.email}`);
      return user;
    } catch (error) {
      this.logger.error(`Error getting user by email ${data.email}:`, error);
      throw error;
    }
  }

  /**
   * Message Pattern: create_user
   * Cria um novo usuário (usado para registro)
   */
  @MessagePattern({ cmd: 'create_user' })
  async createUser(@Payload() data: any) {
    this.logger.info(`Received create_user message for email: ${data.email}`);

    try {
      const user = await this.usersService.createUser(data);
      this.logger.info(`Successfully created user: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Error creating user:`, error);
      throw error;
    }
  }
}
