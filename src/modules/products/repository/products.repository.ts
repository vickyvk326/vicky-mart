import { BaseRepository } from 'src/common/repositories/base.repository';
import { Product } from '../entity/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class ProductsRepository extends BaseRepository<Product> {
  constructor(
    @InjectRepository(Product)
    repo: Repository<Product>,
  ) {
    super(repo);
  }
}
