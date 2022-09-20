export interface UserCreationDTO {
  username: string;
  password: string;
  email?: string;
  is_admin: boolean;
}
