import { Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UserRole } from 'src/modules/users/enums/user-role.enum';

export class UserDto {
  @IsUUID()
  @Expose()
  id: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  firstName: string;

  @IsString()
  @IsOptional()
  @Expose()
  lastName: string;

  @IsEmail()
  @Expose()
  email: string;

  @IsString()
  @Expose()
  role: UserRole;

  @IsString()
  @Expose()
  createdAt: Date;

  @IsString()
  @Expose()
  updatedAt: Date;
}
