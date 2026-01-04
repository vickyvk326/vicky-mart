import { Module } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [],
})
export class SeedModule {}
