import { Entity, EntityRepositoryType, Enum, OptionalProps, Property } from '@mikro-orm/core';
import { BaseEntity } from 'src/common/entity/base.entity';
import { JobRepository } from '../repository/job.repository';

export enum JobStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity({ repository: () => JobRepository })
export class JobEntity extends BaseEntity {
  [EntityRepositoryType]?: JobRepository;

  [OptionalProps]?: 'createdAt' | 'updatedAt' | 'deletedAt';

  @Property()
  jobId: string;

  @Property({ type: 'text' })
  flow: string;

  @Enum(() => JobStatus)
  status: JobStatus = JobStatus.PENDING;
}
