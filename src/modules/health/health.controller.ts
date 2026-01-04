import { Controller, Get, UseGuards } from '@nestjs/common';
import { CustomThrottlerGuard } from 'src/core/auth/guards/throttle.guard';
import { HealthService } from './health.service';

@Controller('health')
@UseGuards(CustomThrottlerGuard)
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  get() {
    return this.healthService.check();
  }
}
