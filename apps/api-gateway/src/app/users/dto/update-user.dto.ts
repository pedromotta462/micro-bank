import { z } from 'zod';
import {
  sanitizeText,
  sanitizeEmail,
  normalizeSpaces,
  sanitizeNumeric,
  sanitizeNumericWithHyphen,
} from '../../common/sanitizers';

// Zod Schema para validação com sanitização
export const UpdateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters')
    .transform(sanitizeText)
    .transform(normalizeSpaces)
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .transform(sanitizeEmail)
    .optional(),
  address: z
    .string()
    .max(1000, 'Address must not exceed 1000 characters')
    .transform(sanitizeText)
    .transform(normalizeSpaces)
    .optional()
    .nullable(),
  bankingDetails: z
    .object({
      agency: z
        .string()
        .min(1, 'Agency is required')
        .max(10, 'Agency must not exceed 10 characters')
        .regex(/^[0-9]+$/, 'Agency must contain only numbers')
        .transform(sanitizeNumeric)
        .optional(),
      accountNumber: z
        .string()
        .min(1, 'Account number is required')
        .max(20, 'Account number must not exceed 20 characters')
        .regex(/^[0-9-]+$/, 'Account number must contain only numbers and hyphens')
        .transform(sanitizeNumericWithHyphen)
        .optional(),
    })
    .optional(),
});

// TypeScript type inferido do schema Zod
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
