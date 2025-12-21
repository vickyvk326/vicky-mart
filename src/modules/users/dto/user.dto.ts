import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UserRole } from 'src/modules/users/enums/user-role.enum';

export class UserDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  role: UserRole;

  @IsString()
  createdAt: Date;

  @IsString()
  updated_at: Date;
}
