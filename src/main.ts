import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PinoLogger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // buffer logs until logger is ready
  });

  const logger = await app.resolve(PinoLogger);
  logger.setContext('Bootstrap');

  await app.listen(process.env.PORT ?? 3000);

  logger.info(
    `NestJS application bootstrapped successfully on port ${process.env.PORT || 3000}`,
  );
}
bootstrap();
