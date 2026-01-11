import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppService } from './app.service';
import { BaseRepository } from './common/repositories/base.repository';
import { envValidationSchema, EnvVars } from './config/envValidationSchema';
import { AuthModule } from './core/auth/auth.module';
import { LoggerModule } from './core/logger/logger.module';
import { RedisModule } from './core/redis/redis.module';
import { HealthController } from './modules/health/health.controller';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        throttlers: [
          { name: 'short', ttl: 60000, limit: 10 },
          { name: 'long', ttl: 3600000, limit: 500 },
        ],
        storage: new ThrottlerStorageRedisService({
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          password: config.get<string>('REDIS_PASSWORD'),
        }),
        errorMessage: 'Too many requests, please try again later.',
        setHeaders: true,
      }),
    }),
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      driver: PostgreSqlDriver,
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        driver: PostgreSqlDriver,
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        user: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        dbName: config.get<string>('DB_DATABASE'),
        entityRepository: BaseRepository,
        autoLoadEntities: true,
        allowGlobalContext: false, // Security: forces request-forked EntityManager
        debug: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    HealthModule,
    RedisModule,
    LoggerModule,
    UsersModule,
    AuthModule,
    // ProductsModule,
    // SeedModule,
  ],
  providers: [AppService],
})
export class AppModule {}
