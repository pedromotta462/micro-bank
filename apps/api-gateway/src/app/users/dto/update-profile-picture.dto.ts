import { z } from 'zod';
import { sanitizeUrl } from '../../common/sanitizers';

// Zod Schema para validação com sanitização
export const UpdateProfilePictureSchema = z.object({
  profilePicture: z
    .string()
    .url('Profile picture must be a valid URL')
    .max(500, 'Profile picture URL must not exceed 500 characters')
    .transform(sanitizeUrl),
});

// TypeScript type inferido do schema Zod
export type UpdateProfilePictureDto = z.infer<typeof UpdateProfilePictureSchema>;
