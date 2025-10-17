import { z } from 'zod';

// Zod Schema para validação de registro
export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters'),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(255, 'Password must not exceed 255 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  address: z
    .string()
    .max(1000, 'Address must not exceed 1000 characters')
    .optional(),
  profilePicture: z
    .string()
    .url('Profile picture must be a valid URL')
    .max(500, 'Profile picture URL must not exceed 500 characters')
    .optional(),
  bankingDetails: z
    .object({
      agency: z
        .string()
        .min(1, 'Agency is required')
        .max(10, 'Agency must not exceed 10 characters')
        .regex(/^[0-9]+$/, 'Agency must contain only numbers'),
      accountNumber: z
        .string()
        .min(1, 'Account number is required')
        .max(20, 'Account number must not exceed 20 characters')
        .regex(/^[0-9-]+$/, 'Account number must contain only numbers and hyphens'),
    })
    .optional(),
});

// TypeScript type inferido do schema Zod
export type RegisterDto = z.infer<typeof RegisterSchema>;
