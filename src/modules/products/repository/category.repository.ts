import { BaseRepository } from 'src/common/repositories/base.repository';
import { Category } from '../entity/category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class CategoryRepository extends BaseRepository<Category> {
  constructor(
    @InjectRepository(Category)
    repo: Repository<Category>,
  ) {
    super(repo);
  }
}
