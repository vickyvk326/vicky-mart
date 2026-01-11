import { UserRole } from '../enums/user-role.enum';
import { Entity, Property, Unique, EntityRepositoryType, Enum, Opt } from '@mikro-orm/core';
import { UsersRepository } from '../repository/users.repository';
import { BaseEntity } from '../../../common/entity/base.entity';

@Entity({ repository: () => UsersRepository })
export class User extends BaseEntity {
  // automatic type inference in services
  [EntityRepositoryType]?: UsersRepository;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property()
  @Unique()
  email!: string;

  @Property({ hidden: true }) // skip this field in JSON output
  password!: string;

  @Enum({ items: () => UserRole, default: UserRole.CUSTOMER })
  role: UserRole & Opt = UserRole.CUSTOMER;

  @Property({ nullable: true })
  refreshTokenHash: string | null;
}
