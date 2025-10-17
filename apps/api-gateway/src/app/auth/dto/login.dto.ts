import { z } from 'zod';

// Zod Schema para validação de login
export const LoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(255, 'Password must not exceed 255 characters'),
});

// TypeScript type inferido do schema Zod
export type LoginDto = z.infer<typeof LoginSchema>;
