import { z } from 'zod';

/**
 * Schema Zod para parâmetros de listagem de transações
 */
export const getTransactionsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: 'A página deve ser maior que 0' }),
  
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, { 
      message: 'O limite deve estar entre 1 e 100' 
    }),
  
  status: z
    .enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED'])
    .optional(),
  
  type: z
    .enum(['TRANSFER', 'PIX', 'TED', 'DOC', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL'])
    .optional(),
});

/**
 * DTO inferido do schema Zod
 */
export type GetTransactionsQueryDto = z.infer<typeof getTransactionsQuerySchema>;
