import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from '../services/users.service';
import {
  GetUserByIdDto,
  UpdateUserDto,
  UpdateProfilePictureDto,
  ProcessTransactionBalanceDto,
} from '../dto';

@Controller()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Message Pattern: get_user_by_id
   * Retorna os detalhes de um usuário incluindo dados bancários
   */
  @MessagePattern({ cmd: 'get_user_by_id' })
  async getUserById(@Payload() data: GetUserByIdDto) {
    this.logger.log(`Received get_user_by_id message for userId: ${data.userId}`);
    
    try {
      const user = await this.usersService.getUserById(data);
      this.logger.log(`Successfully retrieved user: ${data.userId}`);
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
    this.logger.log(`Received update_user message for userId: ${data.userId}`);
    
    try {
      const user = await this.usersService.updateUser(data);
      this.logger.log(`Successfully updated user: ${data.userId}`);
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
    this.logger.log(
      `Received upload_profile_picture message for userId: ${data.userId}`
    );
    
    try {
      const result = await this.usersService.uploadProfilePicture(
        data
      );
      this.logger.log(`Successfully uploaded profile picture for user: ${data.userId}`);
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
    @Payload() data: ProcessTransactionBalanceDto & { transactionId?: string }
  ) {
    this.logger.log(
      `🔄 Received process_transaction_balance message: ${data.senderId} -> ${data.receiverId} (${data.totalAmount})`
    );
    
    try {
      const result = await this.usersService.processTransactionBalance(data);
      
      if (result.success) {
        this.logger.log(`✅ Balance processed successfully for transaction ${data.transactionId || 'N/A'}`);
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
  @MessagePattern({ cmd: 'get_user_transaction_balance' })
  async getUserTransactionBalance(@Payload() data: { userId: string }) {
    this.logger.log(`Received get_user_transaction_balance message for userId: ${data.userId}`);

    try {
      const balance = await this.usersService.getUserTransactionBalance(data.userId);
      this.logger.log(`Successfully retrieved transaction balance for user: ${data.userId}`);
      return balance;
    } catch (error) {
      this.logger.error(`Error getting transaction balance for user ${data.userId}:`, error);
      throw error;
    }
  }
}
