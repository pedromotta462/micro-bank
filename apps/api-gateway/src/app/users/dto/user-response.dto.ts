export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  address: string | null;
  profilePicture: string | null;
  bankingDetails: {
    id: string;
    agency: string;
    accountNumber: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
