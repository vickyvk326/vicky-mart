import {
  EntityRepository,
  FilterQuery,
  FindOptions,
  RequiredEntityData,
  FindOneOrFailOptions,
  Loaded,
  EntityData,
  UpsertOptions,
} from '@mikro-orm/core';
import { NotFoundException } from '@nestjs/common';
import { PaginationDto } from '../dto/pagination.dto';

export abstract class BaseRepository<T extends { id: string | number }> extends EntityRepository<T> {
  async findAllWithPagination(
    pagination: PaginationDto,
    where: FilterQuery<T> = {},
    options: FindOptions<T, any, any, any> = {},
  ) {
    const limit = pagination.limit ?? 10;
    const offset = ((pagination.page ?? 1) - 1) * limit;

    const [data, total] = await this.findAndCount(where, {
      ...options,
      limit,
      offset,
      cache: 10000,
    } as FindOptions<T, any, any, any>);

    return {
      data,
      meta: {
        total,
        page: pagination.page ?? 1,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // To satisfy the base class, we must match the generic signature exactly
  override async findOneOrFail<
    Hint extends string = never,
    Fields extends string = '*',
    Excludes extends string = never,
  >(
    where: FilterQuery<T>,
    options?: FindOneOrFailOptions<T, Hint, Fields, Excludes>,
  ): Promise<Loaded<T, Hint, Fields, Excludes>> {
    // We cast to 'never' or 'unknown' before the final type to satisfy no-unsafe-argument
    const entity = await this.findOne(where, options as FindOptions<T, Hint, Fields, Excludes>);

    if (!entity) {
      // Fix for no-base-to-string: Cast the EntityName to string explicitly
      const name = typeof this.entityName === 'string' ? this.entityName : (this.entityName as { name: string }).name;
      throw new NotFoundException(`${String(name)} not found`);
    }

    return entity;
  }

  async softDelete(where: FilterQuery<T>): Promise<number> {
    // Fix for no-unsafe-argument: use EntityData<T> type for the update object
    const data = { deletedAt: new Date() } as unknown as EntityData<T>;
    return this.em.nativeUpdate(this.entityName, where, data);
  }

  // Correct the signature to match EntityRepository.upsert exactly
  override async upsert<Fields extends string = any>(
    entityOrData?: T | EntityData<T>,
    options?: UpsertOptions<T, Fields>,
  ): Promise<T> {
    return this.em.upsert(this.entityName, entityOrData as EntityData<T>, options);
  }
}

export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> } & { [key: string]: any };

export type DeepRequired<T> = { [P in keyof T]-?: DeepRequired<T[P]> } & { [key: string]: any };

export type DeepPartialRequired<T> = { [P in keyof T]-?: DeepPartialRequired<T[P]> } & { [key: string]: any };

export type DeepRequiredEntityData<T> = DeepRequired<RequiredEntityData<T>>;

export type DeepPartialEntityData<T> = DeepPartial<RequiredEntityData<T>>;

export type DeepPartialRequiredEntityData<T> = DeepPartialRequired<RequiredEntityData<T>>;
