import { z } from 'zod';

/**
 * Schema Zod para processar transação de saldo
 */
export const processTransactionBalanceDtoSchema = z.object({
  senderId: z.string().uuid(),
  receiverId: z.string().uuid(),
  totalAmount: z.number().positive(),
  netAmount: z.number().positive(),
});

export type ProcessTransactionBalanceDto = z.infer<
  typeof processTransactionBalanceDtoSchema
>;
