import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repositories/base.repository';
import { User } from '../entity/user.entity';
import { FilterQuery, FindOneOrFailOptions, Loaded } from '@mikro-orm/core';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  async findById<P extends string = never, F extends string = '*', E extends string = never>(
    id: string | number,
    options?: FindOneOrFailOptions<User, P, F, E>,
  ): Promise<Loaded<User, P, F, E>> {
    return await this.findOneOrFail({ id } as FilterQuery<User>, options);
  }

  async findByEmail(email: string, options?: FindOneOrFailOptions<User>): Promise<User> {
    return await this.findOneOrFail({ email } as FilterQuery<User>, options);
  }
}

export type UserField = keyof User;
