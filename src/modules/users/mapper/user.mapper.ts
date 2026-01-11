import { User } from '../entity/user.entity';
import { UserDto } from '../dto/user.dto';
import { Loaded } from '@mikro-orm/core';

export class UserMapper {
  static toDto(this: void, user: User | Loaded<User, any>): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
