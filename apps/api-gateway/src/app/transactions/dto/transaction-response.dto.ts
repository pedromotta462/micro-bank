import { z } from 'zod';

/**
 * Schema Zod para resposta de transação
 */
export const transactionResponseSchema = z.object({
  id: z.string().uuid(),
  senderUserId: z.string().uuid(),
  receiverUserId: z.string().uuid(),
  amount: z.number(),
  fee: z.number(),
  totalAmount: z.number(),
  description: z.string(),
  idempotencyKey: z.string().nullable().optional(),
  type: z.enum(['TRANSFER', 'PIX', 'TED', 'DOC', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL']),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED']),
  failureReason: z.string().nullable().optional(),
  retryCount: z.number(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  completedAt: z.date().or(z.string()).nullable().optional(),
  cancelledAt: z.date().or(z.string()).nullable().optional(),
});

/**
 * DTO inferido do schema Zod
 */
export type TransactionResponseDto = z.infer<typeof transactionResponseSchema>;

/**
 * Schema para lista de transações
 */
export const transactionsListResponseSchema = z.object({
  transactions: z.array(transactionResponseSchema),
  total: z.number(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

/**
 * DTO inferido do schema de lista
 */
export type TransactionsListResponseDto = z.infer<typeof transactionsListResponseSchema>;
