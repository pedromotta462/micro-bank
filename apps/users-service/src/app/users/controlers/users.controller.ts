import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from '../services/users.service';
import {
  GetUserByIdDto,
  UpdateUserDto,
  UpdateProfilePictureDto,
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
   * Message Pattern: update_profile_picture
   * Atualiza a foto de perfil de um usuário
   */
  @MessagePattern({ cmd: 'update_profile_picture' })
  async updateProfilePicture(@Payload() data: UpdateProfilePictureDto) {
    this.logger.log(
      `Received update_profile_picture message for userId: ${data.userId}`
    );
    
    try {
      const result = await this.usersService.updateProfilePicture(data);
      this.logger.log(`Successfully updated profile picture for user: ${data.userId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error updating profile picture for user ${data.userId}:`,
        error
      );
      throw error;
    }
  }
}
