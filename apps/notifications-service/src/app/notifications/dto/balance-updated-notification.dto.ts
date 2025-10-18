import { z } from 'zod';

/**
 * Schema Zod para validação de notificação de atualização de saldo
 */
export const BalanceUpdatedNotificationSchema = z.object({
  userId: z
    .string()
    .uuid({ message: 'User ID deve ser um UUID válido' }),
  
  type: z.enum(['DEBIT', 'CREDIT'], {
    message: 'Type deve ser DEBIT ou CREDIT',
  }),
  
  amount: z
    .number()
    .positive({ message: 'Amount deve ser um número positivo' }),
  
  newBalance: z
    .number()
    .nonnegative({ message: 'New balance não pode ser negativo' }),
  
  transactionId: z
    .string()
    .uuid({ message: 'Transaction ID deve ser um UUID válido' })
    .optional(),
  
  timestamp: z.string(),
});

/**
 * DTO inferido do schema Zod
 */
export type BalanceUpdatedNotificationDto = z.infer<typeof BalanceUpdatedNotificationSchema>;
