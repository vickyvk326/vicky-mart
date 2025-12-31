import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-products.dto';
import { UpdateProductDto } from './dto/update-products.dto';
import { ProductsRepository } from './repository/products.repository';
import { SubCategoryRepository } from './repository/subCategory.repository';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly subCategoryRepository: SubCategoryRepository,
  ) {}
  async create(createProductDto: CreateProductDto) {
    const { images, attributes, subCategoryName, ...productData } = createProductDto;

    const imagesEntities = images.map((url) => ({ url }));

    const attributeEntities = attributes.flatMap((attr) =>
      Object.entries(attr).map(([key, value]) => ({
        key,
        value: String(value),
      })),
    );

    const subCategory = await this.subCategoryRepository.findOne({ where: { name: subCategoryName } });

    const product = this.productsRepository.create({
      images: imagesEntities,
      attributes: attributeEntities,
      subCategory: subCategory ?? undefined,
      ...productData,
    });
    return this.productsRepository.save(product);
  }

  findAllWithPagination(paginaton: PaginationDto) {
    return this.productsRepository.findAllWithPagination(paginaton);
  }

  findOne(id: number) {
    return `This action returns a #id products`;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #id products`;
  }

  remove(id: number) {
    return `This action removes a #id products`;
  }
}
