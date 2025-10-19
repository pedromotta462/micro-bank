import { z } from 'zod';

/**
 * Schema Zod para validação de criação de transação
 */
export const createTransactionSchema = z.object({
  receiverUserId: z
    .string()
    .uuid({ message: 'O ID do destinatário deve ser um UUID válido' }),
  
  amount: z
    .number()
    .positive({ message: 'O valor deve ser positivo' })
    .max(9999999999999.99, { message: 'Valor máximo excedido' })
    .refine((val) => {
      // Valida máximo de 2 casas decimais
      return Number(val.toFixed(2)) === val;
    }, { message: 'O valor deve ter no máximo 2 casas decimais' }),
  
  description: z
    .string()
    .min(1, { message: 'A descrição não pode estar vazia' })
    .max(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
    .trim(),
  
  type: z
    .enum(['TRANSFER', 'PIX', 'TED', 'DOC', 'PAYMENT'], {
      message: 'Tipo de transação inválido',
    })
    .default('TRANSFER')
    .optional(),
  
  idempotencyKey: z
    .string()
    .uuid({ message: 'A chave de idempotência deve ser um UUID válido' })
    .optional(),
});

/**
 * DTO inferido do schema Zod
 */
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
