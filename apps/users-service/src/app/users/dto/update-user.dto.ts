export class UpdateUserDto {
  userId: string;
  name?: string;
  email?: string;
  address?: string;
  bankingDetails?: {
    agency?: string;
    accountNumber?: string;
  };
}
