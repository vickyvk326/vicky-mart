import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { CreateProductDto } from './dto/create-products.dto';
import { FilterPaginationDto } from './dto/filterPagination.dto';
import { UpdateProductDto } from './dto/update-products.dto';
import { CategoryRepository } from './repository/category.repository';
import { ProductsRepository } from './repository/products.repository';
import { SubCategoryRepository } from './repository/subCategory.repository';
import { Product } from './entity/product.entity';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class ProductsService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly productsRepo: ProductsRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly subCategoryRepo: SubCategoryRepository,
  ) {}
  async create(createProductDto: CreateProductDto) {
    const { images, attributes, subCategoryName, categoryName, ...productData } = createProductDto;

    // 1. Handle Category & SubCategory (Find or Create)
    let category = await this.categoryRepo.findOneBy({ name: categoryName });
    if (!category) {
      category = await this.categoryRepo.save(this.categoryRepo.create({ name: categoryName }));
    }

    let subCategory = await this.subCategoryRepo.findOneBy({
      name: subCategoryName,
      category: { id: category.id },
    });
    if (!subCategory) {
      subCategory = await this.subCategoryRepo.save(this.subCategoryRepo.create({ name: subCategoryName, category }));
    }

    // 2. Prepare nested entities
    const imagesEntities = images.map((url) => ({ url }));
    const attributeEntities = attributes.flatMap((attr) =>
      Object.entries(attr).map(([key, value]) => ({
        key,
        value: String(value),
      })),
    );

    // 3. Create the Product (Check if it exists first to avoid duplicates)
    const existingProduct = await this.productsRepo.findOneBy({ pid: productData.pid });

    const product = this.productsRepo.create({
      ...existingProduct, // This allows updating if it already exists
      ...productData,
      subCategory,
      images: imagesEntities,
      attributes: attributeEntities,
    });

    return this.productsRepo.save(product);
  }

  async findAllWithPagination(query: FilterPaginationDto) {
    // 1. Generate a Unique Key
    const cacheKey = `products:all:${JSON.stringify(query)}`;

    // 2. Try to fetch from Redis
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData) as {
        items: Product[];
        meta: {
          totalItems: number;
          itemCount: number;
          itemsPerPage: number;
          totalPages: number;
          currentPage: number;
        };
      };
    }

    const { page = 1, limit = 10, search, brand, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productsRepo.createQueryBuilder('product');

    queryBuilder
      // Join SubCategory but only select the 'name' column
      .leftJoin('product.subCategory', 'subCategory')
      .addSelect(['subCategory.name'])

      // Join Category via subCategory but only select the 'name' column
      .leftJoin('subCategory.category', 'category')
      .addSelect(['category.name'])

      // Standard join for images and attributes
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.attributes', 'attributes');

    // 1. Search Logic
    if (search) {
      queryBuilder.andWhere('(product.title ILIKE :search OR product.brand ILIKE :search)', { search: `%${search}%` });
    }

    // 2. Filter Logic
    if (brand) {
      queryBuilder.andWhere('product.brand = :brand', { brand });
    }

    // 3. Sorting & Pagination
    queryBuilder.orderBy(`product.${sortBy}`, sortOrder).skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    const response = {
      items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };

    const cleanResponse = instanceToPlain(response);

    await this.redis.set(cacheKey, JSON.stringify(cleanResponse), 'EX', 3600);

    return cleanResponse;
  }

  async findOne(id: string) {
    const cacheKey = `products:one:${id}`;

    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData) as Product;
    }

    const product = await this.productsRepo.findOne({
      where: { id },
      relations: [
        'subCategory',
        'subCategory.category', // Joins the category through the subcategory
        'images',
        'attributes',
      ],
      relationLoadStrategy: 'join',
    });

    if (!product) throw new NotFoundException('Product not found');

    const cleanProduct = instanceToPlain(product);

    await this.redis.set(cacheKey, JSON.stringify(cleanProduct), 'EX', 3600);
    return cleanProduct;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.redis.del(`products:all:*`);
    await this.redis.del(`products:one:${id}`);
    return `This action updates a #id products`;
  }

  remove(id: string) {
    return `This action removes ${id} product`;
  }
}
