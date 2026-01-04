import { Controller, Post, Query } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedDto } from './dto/seed.dto';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  seed(@Query() seedQuery?: SeedDto) {
    return this.seedService.seed(seedQuery?.table);
  }
}
