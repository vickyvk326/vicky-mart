import { IsBoolean, IsNotEmpty, IsPositive, IsString, IsOptional, IsArray, IsNumber, Min, Max } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  pid: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional() // Some Flipkart records have empty descriptions
  description?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsNumber()
  @IsPositive()
  actualPrice: number;

  @IsNumber()
  @IsPositive()
  sellingPrice: number;

  @IsString()
  @IsOptional()
  discount?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating: number;

  @IsBoolean()
  outOfStock: boolean;

  @IsString()
  @IsNotEmpty()
  subCategoryName: string; // We'll use this to find/create the entity

  @IsArray()
  @IsString({ each: true }) // Validates every item in the array is a string
  images: string[];

  @IsArray()
  attributes: any[]; // Use 'any' or a nested DTO since these are objects
}
