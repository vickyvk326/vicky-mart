import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CreateProductDto } from './dto/create-products.dto';
import { FilterPaginationDto } from './dto/filterPagination.dto';
import { UpdateProductDto } from './dto/update-products.dto';
import { ProductsService } from './products.service';
import { UserRole } from '../users/enums/user-role.enum';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/core/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('create')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  create(@Body() createProductsDto: CreateProductDto) {
    return this.productsService.create(createProductsDto);
  }

  @Get('search')
  @Public()
  findAll(@Query() pagination: FilterPaginationDto) {
    return this.productsService.findAllWithPagination(pagination);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  update(@Param('id') id: string, @Body() updateProductsDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductsDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
