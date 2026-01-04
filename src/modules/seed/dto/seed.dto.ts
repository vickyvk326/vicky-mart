import { IsOptional, IsString } from 'class-validator';

export class SeedDto {
  @IsOptional()
  @IsString()
  table?: string;
}
