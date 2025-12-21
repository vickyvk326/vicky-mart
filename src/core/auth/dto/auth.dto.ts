import { OmitType, PartialType, PickType } from '@nestjs/mapped-types';
import { IsString, MinLength } from 'class-validator';
import { UserDto } from 'src/modules/users/dto/user.dto';

export class RegisterDto extends PickType(UserDto, ['firstName', 'lastName', 'email'] as const) {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}

export class LoginDto extends PickType(RegisterDto, ['email', 'password'] as const) {}

export class UpdateUserDto extends PartialType(OmitType(RegisterDto, ['password'] as const)) {}
