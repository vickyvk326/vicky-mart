import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './repository/products.repository';
import { SubCategoryRepository } from './repository/subCategory.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entity/product.entity';
import { SubCategory } from './entity/subCategory.entity';
import { Category } from './entity/category.entity';
import { ProductImage } from './entity/product-image.entity';
import { ProductAttribute } from './entity/product-attribute.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, SubCategory, ProductImage, ProductAttribute])],
  controllers: [ProductsController],
  providers: [ProductsRepository, SubCategoryRepository, ProductsService],
  exports: [],
})
export class ProductsModule {}
