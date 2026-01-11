import { PrimaryKey, Property, Filter, OptionalProps } from '@mikro-orm/core';

@Filter({ name: 'softDelete', cond: { deletedAt: null }, default: true })
export abstract class BaseEntity {
  // This helps TypeScript know these props are optional during creation
  [OptionalProps]?: 'createdAt' | 'updatedAt' | 'deletedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  deletedAt?: Date;
}
