import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../services/users.service';
import {
  UpdateUserDto,
  UpdateUserSchema,
  UserResponseDto,
  GetUserByIdParams,
  GetUserByIdSchema,
} from '../dto';
import { ZodValidationPipe, FileValidationPipe } from '../../common/pipes';
import { JwtAuthGuard, OwnershipGuard } from '../../auth/guards';
import { CurrentUser, CurrentUserData } from '../../auth/decorators';

/**
 * Controller responsável pelos endpoints de usuários no API Gateway
 * PROTEGIDO: Requer autenticação JWT + ownership
 */
@Controller('/users')
@UseGuards(JwtAuthGuard, OwnershipGuard)
export class UsersController {
  constructor(
    @InjectPinoLogger(UsersController.name)
    private readonly logger: PinoLogger,
    private readonly usersService: UsersService
  ) {}

  /**
   * GET /api/users/:userId
   * Detalhes do cliente
   * PROTEGIDO: Requer autenticação JWT + ownership (só pode ver próprios dados)
   */
  @Get(':userId')
  async getUserById(
    @Param(new ZodValidationPipe(GetUserByIdSchema)) params: GetUserByIdParams,
    @CurrentUser() user: CurrentUserData
  ): Promise<UserResponseDto> {
    this.logger.info(`Getting user details for userId: ${params.userId}, authenticated user: ${user.userId}`);

    try {
      const userDetails = await this.usersService.getUserById(params.userId);
      return userDetails;
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

  @Get('/:email')
  async getUserByEmail(
    @Param('email') email: string,
    @CurrentUser() user: CurrentUserData
  ): Promise<UserResponseDto> {
    this.logger.info(`Getting user details for email: ${email}, authenticated user: ${user.userId}`);

    try {
      const userDetails = await this.usersService.getUserByEmail(email);
      return userDetails;
    } catch (error) {
      this.logger.error(
        `Error getting user with email ${email}: ${error.message}`,
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
   * PROTEGIDO: Requer autenticação JWT + ownership (só pode atualizar próprios dados)
   */
  @Patch(':userId')
  async updateUser(
    @Param(new ZodValidationPipe(GetUserByIdSchema)) params: GetUserByIdParams,
    @Body(new ZodValidationPipe(UpdateUserSchema)) updateUserDto: UpdateUserDto,
    @CurrentUser() user: CurrentUserData
  ): Promise<{ message: string; user: UserResponseDto }> {
    this.logger.info(`Updating user ${params.userId} with data, authenticated user: ${user.userId}`, updateUserDto);

    try {
      const updatedUser = await this.usersService.updateUser(params.userId, updateUserDto);
      return {
        message: 'User updated successfully',
        user: updatedUser,
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
   * Upload e atualização da foto de perfil
   * Content-Type: multipart/form-data
   * Campo: file (jpg, jpeg, png, webp, máx 5MB)
   * PROTEGIDO: Requer autenticação JWT + ownership
   */
  @Patch(':userId/profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async updateProfilePicture(
    @Param(new ZodValidationPipe(GetUserByIdSchema)) params: GetUserByIdParams,
    @UploadedFile(new FileValidationPipe()) file: any,
    @CurrentUser() user: CurrentUserData
  ): Promise<{ message: string; profilePicture: string }> {
    this.logger.info(
      `Uploading profile picture for user ${params.userId}, file: ${file.originalname}, authenticated user: ${user.userId}`
    );

    try {
      const result = await this.usersService.uploadProfilePicture(
        params.userId,
        file
      );
      return {
        message: 'Profile picture uploaded successfully',
        profilePicture: result.profilePicture,
      };
    } catch (error) {
      this.logger.error(
        `Error uploading profile picture for user ${params.userId}: ${error.message}`,
        error.stack
      );
      throw new HttpException(
        error.message || 'Failed to upload profile picture',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/users/:userId/transaction-balance
   * Consultar saldo da conta bancária do usuário
   * PROTEGIDO: Requer autenticação JWT + ownership
   */
  @Get(':userId/transaction-balance')
  async getUserTransactionBalance(
    @Param(new ZodValidationPipe(GetUserByIdSchema)) params: GetUserByIdParams,
    @CurrentUser() user: CurrentUserData
  ): Promise<{ balance: number }> {
    this.logger.info(`Getting transaction balance for userId: ${params.userId}, authenticated user: ${user.userId}`);

    try {
      const balance = await this.usersService.getUserTransactionBalance(params.userId);
      return balance;
    } catch (error) {
      this.logger.error(
        `Error getting transaction balance for user ${params.userId}: ${error.message}`,
        error.stack
      );
      throw new HttpException(
        error.message || 'Failed to get transaction balance',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
