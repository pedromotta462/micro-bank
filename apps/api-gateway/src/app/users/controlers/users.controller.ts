import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UsePipes,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import {
  UpdateUserDto,
  UpdateUserSchema,
  UpdateProfilePictureDto,
  UpdateProfilePictureSchema,
  UserResponseDto,
  GetUserByIdParams,
  GetUserByIdSchema,
} from '../dto';
import { ZodValidationPipe } from '../../common/pipes';

@Controller('/users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/users/:userId
   * Detalhes do cliente
   */
  @Get(':userId')
  async getUserById(
    @Param(new ZodValidationPipe(GetUserByIdSchema)) params: GetUserByIdParams
  ): Promise<UserResponseDto> {
    this.logger.log(`Getting user details for userId: ${params.userId}`);

    try {
      const user = await this.usersService.getUserById(params.userId);
      return user;
    } catch (error) {
      this.logger.error(
        `Error getting user ${params.userId}: ${error.message}`,
        error.stack
      );
      throw new HttpException(
        error.message || 'Failed to get user details',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * PATCH /api/users/:userId
   * Atualização parcial de dados do cliente
   */
  @Patch(':userId')
  async updateUser(
    @Param(new ZodValidationPipe(GetUserByIdSchema)) params: GetUserByIdParams,
    @Body(new ZodValidationPipe(UpdateUserSchema)) updateUserDto: UpdateUserDto
  ): Promise<{ message: string; user: UserResponseDto }> {
    this.logger.log(`Updating user ${params.userId} with data:`, updateUserDto);

    try {
      const user = await this.usersService.updateUser(params.userId, updateUserDto);
      return {
        message: 'User updated successfully',
        user,
      };
    } catch (error) {
      this.logger.error(
        `Error updating user ${params.userId}: ${error.message}`,
        error.stack
      );
      throw new HttpException(
        error.message || 'Failed to update user',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * PATCH /api/users/:userId/profile-picture
   * Atualização da foto de perfil
   */
  @Patch(':userId/profile-picture')
  async updateProfilePicture(
    @Param(new ZodValidationPipe(GetUserByIdSchema)) params: GetUserByIdParams,
    @Body(new ZodValidationPipe(UpdateProfilePictureSchema))
    updateProfilePictureDto: UpdateProfilePictureDto
  ): Promise<{ message: string; profilePicture: string }> {
    this.logger.log(
      `Updating profile picture for user ${params.userId}`
    );

    try {
      const result = await this.usersService.updateProfilePicture(
        params.userId,
        updateProfilePictureDto.profilePicture
      );
      return {
        message: 'Profile picture updated successfully',
        profilePicture: result.profilePicture,
      };
    } catch (error) {
      this.logger.error(
        `Error updating profile picture for user ${params.userId}: ${error.message}`,
        error.stack
      );
      throw new HttpException(
        error.message || 'Failed to update profile picture',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
