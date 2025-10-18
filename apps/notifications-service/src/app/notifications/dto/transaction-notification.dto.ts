import { z } from 'zod';

/**
 * Schema Zod para validação de notificação de transação
 */
export const TransactionNotificationSchema = z.object({
  eventType: z.string().min(1, { message: 'Event type é obrigatório' }),
  
  transactionId: z
    .string()
    .uuid({ message: 'Transaction ID deve ser um UUID válido' }),
  
  senderUserId: z
    .string()
    .uuid({ message: 'Sender User ID deve ser um UUID válido' }),
  
  receiverUserId: z
    .string()
    .uuid({ message: 'Receiver User ID deve ser um UUID válido' }),
  
  amount: z
    .number()
    .positive({ message: 'Amount deve ser um número positivo' }),
  
  status: z.string().min(1, { message: 'Status é obrigatório' }),
  
  timestamp: z.coerce.date(),
});

/**
 * DTO inferido do schema Zod
 */
export type TransactionNotificationDto = z.infer<typeof TransactionNotificationSchema>;
