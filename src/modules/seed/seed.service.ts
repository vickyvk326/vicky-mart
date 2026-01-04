import * as fs from 'fs';
import * as path from 'path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { Product } from 'src/types/seed';
import { PinoLogger } from 'nestjs-pino/PinoLogger';

@Injectable()
export class SeedService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SeedService.name);
  }

  async seedProducts() {
    const filePath = path.resolve(__dirname, '../../../data/flipkart_fashion_products_dataset.json');
    if (!fs.existsSync(filePath)) throw new NotFoundException(`Seed file "${filePath}" not found`);
    const data = fs.readFileSync(filePath, 'utf8');
    const rawData = JSON.parse(data) as Product[];

    for (const item of rawData) {
      try {
        // 1. Clean the price strings (e.g., "2,999" -> 2999)
        const actualPrice = Number(item.actual_price?.replace(/,/g, '')) || 0;
        const sellingPrice = Number(item.selling_price?.replace(/,/g, '')) || 0;

        // 2. Build the DTO
        const productDto = {
          pid: item.pid,
          title: item.title,
          description: item.description,
          brand: item.brand,
          actualPrice,
          sellingPrice,
          discount: item.discount,
          averageRating: Number(item.average_rating) || 0,
          outOfStock: item.out_of_stock || false,
          subCategoryName: item.sub_category,
          categoryName: item.category,
          images: item.images || [],
          attributes: item.product_details || [],
        };

        await this.productsService.create(productDto);
      } catch (error) {
        this.logger.error(`Failed to seed product ${item.pid}:${error.message || error}`);
      }
    }
    this.logger.info(`Successfully seeded product ${rawData.length} products.`);
  }

  async seed(tableName?: string) {
    if (tableName) {
      if (tableName === 'products') await this.seedProducts();
      return;
    }
    await this.seedProducts();
  }
}
