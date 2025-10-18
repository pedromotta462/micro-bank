import { z } from 'zod';

/**
 * Schema Zod para parâmetros de rota de transação por ID
 */
export const getTransactionByIdParamsSchema = z.object({
  transactionId: z
    .string()
    .uuid({ message: 'ID de transação inválido' }),
});

/**
 * Schema Zod para parâmetros de rota de transações por usuário
 */
export const getTransactionsByUserIdParamsSchema = z.object({
  userId: z
    .string()
    .uuid({ message: 'ID de usuário inválido' }),
});

/**
 * DTOs inferidos dos schemas Zod
 */
export type GetTransactionByIdParams = z.infer<typeof getTransactionByIdParamsSchema>;
export type GetTransactionsByUserIdParams = z.infer<typeof getTransactionsByUserIdParamsSchema>;
