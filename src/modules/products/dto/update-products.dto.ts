import { OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-products.dto';

export class UpdateProductDto extends OmitType(CreateProductDto, ['pid']) {}
