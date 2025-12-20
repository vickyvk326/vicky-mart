import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HealthService.name);
  }

  async check() {
    await this.dataSource.query('SELECT 1');
    await this.redis.ping();
    this.logger.info('Health check: OK');
    return { status: 'ok' };
  }
}
