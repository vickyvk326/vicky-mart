import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RedisModule } from 'src/core/redis/redis.module';

@Module({
  imports: [RedisModule, MikroOrmModule.forFeature([])],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
