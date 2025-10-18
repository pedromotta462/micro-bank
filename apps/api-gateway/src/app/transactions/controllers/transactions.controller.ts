import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  HttpStatus,
  HttpCode,
  Logger,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { TransactionsService } from '../services/transactions.service';
import {
  createTransactionSchema,
  CreateTransactionDto,
  TransactionResponseDto,
  TransactionsListResponseDto,
  getTransactionsQuerySchema,
  GetTransactionsQueryDto,
  getTransactionByIdParamsSchema,
  GetTransactionByIdParams,
  getTransactionsByUserIdParamsSchema,
  GetTransactionsByUserIdParams,
} from '../dto';
import { ZodValidationPipe } from '../../common/pipes';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser, CurrentUserData } from '../../auth/decorators';
import { OwnershipGuard, TransactionOwnershipGuard } from '../../auth/guards';

/**
 * Controller responsável pelos endpoints de transações no API Gateway
 * PROTEGIDO: Requer autenticação JWT
 */
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * POST /api/transactions
   * Inicia uma nova transferência
   * PROTEGIDO: Requer autenticação JWT (fromUserId é sempre o usuário autenticado)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTransaction(
    @Body(new ZodValidationPipe(createTransactionSchema)) createTransactionDto: CreateTransactionDto,
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request
  ): Promise<TransactionResponseDto> {
    this.logger.log(`POST /api/transactions - Creating new transaction for user: ${user.userId}`);

    // Extrai informações de contexto da requisição
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // fromUserId é SEMPRE o usuário autenticado (garantido pela autenticação JWT)
    return this.transactionsService.createTransaction(
      user.userId,
      createTransactionDto,
      ipAddress,
      userAgent
    );
  }

  /**
   * GET /api/transactions/:transactionId
   * Detalhes de uma transferência específica
   * PROTEGIDO: Requer autenticação JWT + ownership (sender OU receiver)
   */
  @Get(':transactionId')
  @UseGuards(TransactionOwnershipGuard)
  @HttpCode(HttpStatus.OK)
  async getTransactionById(
    @Param(new ZodValidationPipe(getTransactionByIdParamsSchema)) params: GetTransactionByIdParams,
    @CurrentUser() user: CurrentUserData
  ): Promise<TransactionResponseDto> {
    this.logger.log(
      `GET /api/transactions/${params.transactionId} - Getting transaction details for user: ${user.userId}`
    );

    return this.transactionsService.getTransactionById(params.transactionId);
  }

  /**
   * GET /api/transactions/user/:userId
   * Lista de transferências de um usuário específico
   * PROTEGIDO: Requer autenticação JWT + ownership
   */
  @Get('user/:userId')
  @UseGuards(OwnershipGuard)
  @HttpCode(HttpStatus.OK)
  async getTransactionsByUserId(
    @Param(new ZodValidationPipe(getTransactionsByUserIdParamsSchema)) params: GetTransactionsByUserIdParams,
    @Query(new ZodValidationPipe(getTransactionsQuerySchema)) queryParams: GetTransactionsQueryDto,
    @CurrentUser() user: CurrentUserData
  ): Promise<TransactionsListResponseDto> {
    this.logger.log(
      `GET /api/transactions/user/${params.userId} - Listing user transactions for authenticated user: ${user.userId}`
    );

    return this.transactionsService.getTransactionsByUserId(
      params.userId,
      queryParams
    );
  }
}
