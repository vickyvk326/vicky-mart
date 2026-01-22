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
import type { ElementSelectorType } from 'src/common/helper/WebScraper';

export enum ScraperAction {
  NAVIGATE = 'NAVIGATE',
  WAIT_FOR_ELEMENT = 'WAIT_FOR_ELEMENT',
  WAIT_FOR_NETWORK = 'WAIT_FOR_NETWORK',
  TAKE_SCREENSHOT = 'TAKE_SCREENSHOT',
  LOAD_FULL_PAGE = 'LOAD_FULL_PAGE',
  CLICK = 'CLICK',
  SCROLL = 'SCROLL',
  INPUT = 'INPUT',
  GET_TEXT = 'GET_TEXT',
  GET_CARDS = 'GET_CARDS',
  GET_TABLE = 'GET_TABLE',
  GET_ATTRIBUTE = 'GET_ATTRIBUTE',
  EXECUTE_SCRIPT = 'EXECUTE_SCRIPT',
  HTTP_GET = 'HTTP_GET',
  HTTP_POST = 'HTTP_POST',
  WAIT_FOR_LOAD = 'WAIT_FOR_LOAD',
}
export class CardsItems {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  selector: string;

  @IsEnum(['css', 'xpath', 'text', 'id'])
  type: ElementSelectorType = 'css';
}
export class ScrapeTableOptions {
  @IsOptional()
  @IsEnum(['css', 'xpath', 'text', 'id'])
  nextBtnBy?: ElementSelectorType = 'css';

  @IsOptional()
  @IsString()
  nextBtnValue?: string;

  @IsOptional()
  @IsNumber()
  maxPages?: number;

  @IsOptional()
  @IsNumber()
  timeout?: number;
}

export class ScraperOptionsDto {
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @IsOptional()
  @IsEnum(['load', 'domcontentloaded', 'networkidle'])
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' = 'load' as const;

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
  url?: string = 'https://google.com/';

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
  by?: ElementSelectorType = 'css';

  @IsOptional()
  @IsBoolean()
  isAll?: boolean = false;

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

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ScrapeTableOptions)
  paginationOptions?: ScrapeTableOptions;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardsItems)
  cardItems?: CardsItems[];
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

export class ScrapeOptionsDto {
  @IsOptional()
  @IsBoolean()
  allowImages?: boolean = true;

  @IsOptional()
  @IsBoolean()
  allowMedia?: boolean = true;

  @IsOptional()
  @IsBoolean()
  allowFonts?: boolean = true;

  @IsOptional()
  @IsBoolean()
  allowCss?: boolean = true;
}
