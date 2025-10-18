import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { UpdateUserDto, UserResponseDto } from '../dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject('USERS_SERVICE_CLIENT') private readonly usersClient: ClientProxy
  ) {}

  /**
   * Obtém detalhes de um usuário pelo ID
   */
  async getUserById(userId: string): Promise<UserResponseDto> {
    this.logger.log(`Sending get_user_by_id message for userId: ${userId}`);

    try {
      const response = await firstValueFrom(
        this.usersClient
          .send({ cmd: 'get_user_by_id' }, { userId })
          .pipe(timeout(5000))
      );

      this.logger.log(`Received user data for userId: ${userId}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Error communicating with users-service for userId ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Atualiza dados parciais de um usuário
   */
  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    this.logger.log(`Sending update_user message for userId: ${userId}`);

    try {
      const response = await firstValueFrom(
        this.usersClient
          .send({ cmd: 'update_user' }, { userId, ...updateUserDto })
          .pipe(timeout(5000))
      );

      this.logger.log(`User ${userId} updated successfully`);
      return response;
    } catch (error) {
      this.logger.error(
        `Error communicating with users-service for update userId ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Faz upload da foto de perfil de um usuário
   * Envia o arquivo para o microserviço que fará o upload no S3
   */
  async uploadProfilePicture(
    userId: string,
    file: any
  ): Promise<{ profilePicture: string }> {
    this.logger.log(
      `Sending upload_profile_picture message for userId: ${userId}`
    );

    try {
      const response = await firstValueFrom(
        this.usersClient
          .send(
            { cmd: 'upload_profile_picture' },
            {
              userId,
              file: {
                buffer: file.buffer,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
              },
            }
          )
          .pipe(timeout(10000)) // 10s para upload
      );

      this.logger.log(`Profile picture uploaded for user ${userId}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Error communicating with users-service for upload profile picture userId ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Obtém o saldo de transações de um usuário
   */
  async getUserTransactionBalance(userId: string): Promise<{ balance: number }> {
    this.logger.log(`Sending get_user_transaction_balance message for userId: ${userId}`);

    try {
      const response = await firstValueFrom(
        this.usersClient
          .send({ cmd: 'get_user_transaction_balance' }, { userId })
          .pipe(timeout(5000))
      );

      this.logger.log(`Received transaction balance for userId: ${userId}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Error communicating with users-service for userId ${userId}:`,
        error
      );
      throw error;
    }
  }
}
