import { z } from 'zod';

/**
 * Schema Zod para validação de criação de transação no microserviço
 */
export const createTransactionDtoSchema = z.object({
  senderUserId: z.string().uuid(),
  receiverUserId: z.string().uuid(),
  amount: z.number().positive().max(9999999999999.99),
  description: z.string().min(1).max(500),
  type: z
    .enum(['TRANSFER', 'PIX', 'TED', 'DOC', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL'])
    .default('TRANSFER'),
  externalId: z.string().max(100).optional(),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().optional(),
});

export type CreateTransactionDto = z.infer<typeof createTransactionDtoSchema>;

/**
 * Schema para obter transação por ID
 */
export const getTransactionByIdDtoSchema = z.object({
  transactionId: z.string().uuid(),
});

export type GetTransactionByIdDto = z.infer<typeof getTransactionByIdDtoSchema>;

/**
 * Schema para obter transações de um usuário
 */
export const getTransactionsByUserDtoSchema = z.object({
  userId: z.string().uuid(),
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(10).optional(),
  status: z
    .enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED'])
    .optional(),
  type: z
    .enum(['TRANSFER', 'PIX', 'TED', 'DOC', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL'])
    .optional(),
});

export type GetTransactionsByUserDto = z.infer<typeof getTransactionsByUserDtoSchema>;
