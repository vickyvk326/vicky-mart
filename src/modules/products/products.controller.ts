import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateProductDto } from './dto/create-products.dto';
import { UpdateProductDto } from './dto/update-products.dto';
import { ProductsService } from './products.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductsDto: CreateProductDto) {
    return this.productsService.create(createProductsDto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.productsService.findAllWithPagination(pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // return this.productsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductsDto: UpdateProductDto) {
    // return this.productsService.update(+id, updateProductsDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // return this.productsService.remove(+id);
  }
}
