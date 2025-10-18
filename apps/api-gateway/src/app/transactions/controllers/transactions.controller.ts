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
  BadRequestException,
  Logger,
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

/**
 * Controller responsável pelos endpoints de transações no API Gateway
 */
@Controller('transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * POST /api/transactions
   * Inicia uma nova transferência
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTransaction(
    @Body(new ZodValidationPipe(createTransactionSchema)) createTransactionDto: CreateTransactionDto,
    @Req() req: Request
  ): Promise<TransactionResponseDto> {
    this.logger.log('POST /api/transactions - Creating new transaction');

    // Extrai o userId do usuário autenticado (via JWT ou sessão)
    // Por enquanto, vamos usar um mock. Posteriormente será integrado com AuthGuard
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.id || req.headers['x-user-id'] as string;

    if (!userId) {
      throw new BadRequestException('Usuário não autenticado');
    }

    // Extrai informações de contexto da requisição
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.transactionsService.createTransaction(
      userId,
      createTransactionDto,
      ipAddress,
      userAgent
    );
  }

  /**
   * GET /api/transactions/:transactionId
   * Detalhes de uma transferência específica
   */
  @Get(':transactionId')
  @HttpCode(HttpStatus.OK)
  async getTransactionById(
    @Param(new ZodValidationPipe(getTransactionByIdParamsSchema)) params: GetTransactionByIdParams
  ): Promise<TransactionResponseDto> {
    this.logger.log(
      `GET /api/transactions/${params.transactionId} - Getting transaction details`
    );

    return this.transactionsService.getTransactionById(params.transactionId);
  }

  /**
   * GET /api/transactions/user/:userId
   * Lista de transferências de um usuário específico
   */
  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getTransactionsByUserId(
    @Param(new ZodValidationPipe(getTransactionsByUserIdParamsSchema)) params: GetTransactionsByUserIdParams,
    @Query(new ZodValidationPipe(getTransactionsQuerySchema)) queryParams: GetTransactionsQueryDto
  ): Promise<TransactionsListResponseDto> {
    this.logger.log(
      `GET /api/transactions/user/${params.userId} - Listing user transactions`
    );

    return this.transactionsService.getTransactionsByUserId(
      params.userId,
      queryParams
    );
  }
}
