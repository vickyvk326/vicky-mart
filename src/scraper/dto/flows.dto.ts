import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum ScraperAction {
  NAVIGATE = 'NAVIGATE',
  WAIT_FOR_ELEMENT = 'WAIT_FOR_ELEMENT',
  WAIT_FOR_NETWORK = 'WAIT_FOR_NETWORK',
  CLICK = 'CLICK',
  SCROLL = 'SCROLL',
  INPUT = 'INPUT',
  GET_TEXT = 'GET_TEXT',
  GET_ATTRIBUTE = 'GET_ATTRIBUTE',
  EXECUTE_SCRIPT = 'EXECUTE_SCRIPT',
  HTTP_GET = 'HTTP_GET',
  HTTP_POST = 'HTTP_POST',
}

export class ScraperOptionsDto {
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @IsOptional()
  @IsBoolean()
  returnByValue?: boolean;

  @IsOptional()
  @IsBoolean()
  awaitPromise?: boolean;

  @IsOptional()
  @IsBoolean()
  scrollIntoElement?: boolean;
}

// 1. Convert Interface to Class for runtime validation
export class ScraperParamsDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  selector?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  arg?: any;

  @IsOptional()
  @IsEnum(['css', 'xpath', 'text', 'id'])
  by?: 'css' | 'xpath' | 'text' | 'id';

  @IsOptional()
  @IsString()
  attribute?: string;

  @IsOptional()
  script?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ScraperOptionsDto)
  options?: ScraperOptionsDto;
}

export class FlowItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ScraperAction)
  action: ScraperAction;

  @IsObject()
  @ValidateNested()
  @Type(() => ScraperParamsDto)
  params: ScraperParamsDto;
}

export class FlowsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowItemDto)
  flows: FlowItemDto[];
}
