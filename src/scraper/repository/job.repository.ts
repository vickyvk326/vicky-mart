import { BaseRepository } from 'src/common/repositories/base.repository';
import { JobEntity } from '../entity/job.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JobRepository extends BaseRepository<JobEntity> {}
