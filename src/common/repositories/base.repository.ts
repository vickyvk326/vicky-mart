import {
  DeepPartial,
  DeleteResult,
  FindManyOptions,
  FindOptionsWhere,
  ObjectLiteral,
  QueryDeepPartialEntity,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import { PaginationDto } from '../dto/pagination.dto';

export abstract class BaseRepository<T extends ObjectLiteral> {
  constructor(readonly entityRepository: Repository<T>) {}

  /**
   * Find All: Returns all records with pagination from the database.
   */
  async findAllWithPagination(pagination: PaginationDto, options: FindManyOptions<T> = {}) {
    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.entityRepository.findAndCount({
      ...options,
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find One: Returns a single record from the database.
   */
  async findOne(options: FindManyOptions<T>): Promise<T | null> {
    return await this.entityRepository.findOne(options);
  }

  /**
   * Create: Creates a new record instance (Synchronous, no try/catch needed).
   */
  create(data: DeepPartial<T>): T {
    return this.entityRepository.create(data);
  }

  /**
   * Count: Returns the total number of records matching the conditions.
   */
  async count(options: FindManyOptions<T>): Promise<number> {
    return await this.entityRepository.count(options);
  }

  /**
   * Exists: Checks if any record matches the given conditions.
   */
  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.count({ where });
    return count > 0;
  }

  /**
   * Update: Updates a record in the database.
   **/
  async update(
    id: string | number | string[] | number[] | FindOptionsWhere<T>,
    data: QueryDeepPartialEntity<T>,
  ): Promise<UpdateResult> {
    return await this.entityRepository.update(id, data);
  }

  /**
   * Hard Delete: Permanently removes the record(s) from the database.
   */
  async delete(id: string | number | string[] | number[] | FindOptionsWhere<T>): Promise<DeleteResult> {
    return await this.entityRepository.delete(id);
  }

  /**
   * Soft Delete: Marks records as deleted without removing them.
   */
  async softDelete(id: string | number | string[] | number[] | FindOptionsWhere<T>): Promise<UpdateResult> {
    return await this.entityRepository.softDelete(id);
  }

  /**
   * Restore: Reverses a soft delete.
   */
  async restore(id: string | number | string[] | number[] | FindOptionsWhere<T>): Promise<UpdateResult> {
    return await this.entityRepository.restore(id);
  }

  /**
   * Remove: Permanently remove the record(s) using the entity instance.
   */
  async remove(data: T): Promise<T> {
    return await this.entityRepository.remove(data);
  }

  /**
   * Save: Saves a new entity or updates an existing one.
   */
  async save(data: T): Promise<T> {
    return await this.entityRepository.save(data);
  }

  /**
   * Create Query Builder: For complex queries.
   */
  createQueryBuilder(alias: string): SelectQueryBuilder<T> {
    return this.entityRepository.createQueryBuilder(alias);
  }
}
