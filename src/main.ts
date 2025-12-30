import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PinoLogger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // buffer logs until logger is ready
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // transforms to dto instance
      whitelist: true, // strips any unwanted properties
      forbidNonWhitelisted: true, // throws error on unwanted properties
      transformOptions: {
        enableImplicitConversion: true, // enables type conversion
      },
    }),
  );

  const logger = await app.resolve(PinoLogger);
  logger.setContext('Bootstrap');

  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Vicky Mart API')
    .setDescription('The Vicky Mart E-commerce API documentation')
    .setVersion('1.0')
    .addBearerAuth() // Adds Authorize button for JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);

  logger.info(`NestJS application bootstrapped successfully on port ${process.env.PORT || 3000}`);
}
bootstrap().catch((error) => console.error(error));
