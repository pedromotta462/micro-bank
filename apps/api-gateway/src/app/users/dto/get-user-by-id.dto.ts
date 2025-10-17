import { z } from 'zod';

// Zod Schema para validação de UUID
export const GetUserByIdSchema = z.object({
  userId: z
    .string()
    .uuid('Invalid user ID format. Must be a valid UUID'),
});

// TypeScript type inferido do schema Zod
export type GetUserByIdParams = z.infer<typeof GetUserByIdSchema>;
