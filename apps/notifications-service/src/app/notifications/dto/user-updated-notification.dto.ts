import { z } from 'zod';

/**
 * Schema Zod para validação de notificação de atualização de usuário
 */
export const UserUpdatedNotificationSchema = z.object({
  userId: z
    .string()
    .uuid({ message: 'User ID deve ser um UUID válido' }),
  
  timestamp: z.string(),
});

/**
 * DTO inferido do schema Zod
 */
export type UserUpdatedNotificationDto = z.infer<typeof UserUpdatedNotificationSchema>;
