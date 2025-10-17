import { z } from 'zod';

// Zod Schema para validação
export const UpdateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .optional(),
  address: z
    .string()
    .max(1000, 'Address must not exceed 1000 characters')
    .optional()
    .nullable(),
  bankingDetails: z
    .object({
      agency: z
        .string()
        .min(1, 'Agency is required')
        .max(10, 'Agency must not exceed 10 characters')
        .regex(/^[0-9]+$/, 'Agency must contain only numbers')
        .optional(),
      accountNumber: z
        .string()
        .min(1, 'Account number is required')
        .max(20, 'Account number must not exceed 20 characters')
        .regex(/^[0-9-]+$/, 'Account number must contain only numbers and hyphens')
        .optional(),
    })
    .optional(),
});

// TypeScript type inferido do schema Zod
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
