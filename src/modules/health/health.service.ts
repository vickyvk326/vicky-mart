import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';
import { EntityManager } from '@mikro-orm/postgresql';

@Injectable()
export class HealthService {
  constructor(
    private readonly em: EntityManager,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HealthService.name);
  }

  async check() {
    const isDbConnected = await this.em.getConnection().isConnected();
    if (!isDbConnected) throw new Error('Database not connected');

    await this.redis.ping();
    this.logger.info('Health check: OK');
    return { status: 'ok' };
  }
}
