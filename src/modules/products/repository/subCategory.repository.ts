import { BaseRepository } from 'src/common/repositories/base.repository';
import { SubCategory } from '../entity/subCategory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class SubCategoryRepository extends BaseRepository<SubCategory> {
  constructor(
    @InjectRepository(SubCategory)
    repo: Repository<SubCategory>,
  ) {
    super(repo);
  }
}
