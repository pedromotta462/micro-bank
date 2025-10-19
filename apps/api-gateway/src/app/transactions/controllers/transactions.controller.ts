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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
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
@ApiTags('transactions')
@ApiBearerAuth('JWT-auth')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    @InjectPinoLogger(TransactionsController.name)
    private readonly logger: PinoLogger,
    private readonly transactionsService: TransactionsService
  ) {}

  /**
   * POST /api/transactions
   * Inicia uma nova transferência
   * PROTEGIDO: Requer autenticação JWT (fromUserId é sempre o usuário autenticado)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create new transaction', 
    description: 'Create a new transaction/transfer. Sender is authenticated user. Supports idempotency via idempotencyKey.' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['receiverUserId', 'amount', 'description'],
      properties: {
        receiverUserId: { type: 'string', format: 'uuid', example: 'a3233c07-4ca0-43e7-849c-f845528a9b03' },
        amount: { type: 'number', example: 100.50, minimum: 0.01 },
        description: { type: 'string', example: 'Payment for services', maxLength: 500 },
        type: { type: 'string', enum: ['TRANSFER', 'PIX', 'TED', 'DOC', 'PAYMENT'], example: 'TRANSFER' },
        idempotencyKey: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000', description: 'Optional UUID for idempotency. If provided and transaction already exists, returns existing transaction.' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async createTransaction(
    @Body(new ZodValidationPipe(createTransactionSchema)) createTransactionDto: CreateTransactionDto,
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request
  ): Promise<TransactionResponseDto> {
    this.logger.info(`POST /api/transactions - Creating new transaction for user: ${user.userId}`);

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
  @ApiOperation({ 
    summary: 'Get transaction by ID', 
    description: 'Get details of a specific transaction. User must be sender or receiver.' 
  })
  @ApiParam({ name: 'transactionId', type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Transaction details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not sender or receiver' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionById(
    @Param(new ZodValidationPipe(getTransactionByIdParamsSchema)) params: GetTransactionByIdParams,
    @CurrentUser() user: CurrentUserData
  ): Promise<TransactionResponseDto> {
    this.logger.info(
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
  @ApiOperation({ 
    summary: 'Get transactions by user ID', 
    description: 'List all transactions for a specific user. User must be the owner.' 
  })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid', example: '19053dc1-4fc1-4ff7-b5cd-731494430daa' })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'], description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Transactions list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not the owner' })
  async getTransactionsByUserId(
    @Param(new ZodValidationPipe(getTransactionsByUserIdParamsSchema)) params: GetTransactionsByUserIdParams,
    @Query(new ZodValidationPipe(getTransactionsQuerySchema)) queryParams: GetTransactionsQueryDto,
    @CurrentUser() user: CurrentUserData
  ): Promise<TransactionsListResponseDto> {
    this.logger.info(
      `GET /api/transactions/user/${params.userId} - Listing user transactions for authenticated user: ${user.userId}`
    );

    return this.transactionsService.getTransactionsByUserId(
      params.userId,
      queryParams
    );
  }
}
