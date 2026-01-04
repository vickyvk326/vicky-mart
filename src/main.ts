import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptor/response-interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { BotDetectionGuard } from './common/guards/bot-detection.guard';

async function bootstrap() {
  // Initialize nestjs app
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log'],
    bufferLogs: true,
    cors: {
      origin: (origin, callback) => {
        const whitelist = ['http://localhost:3000'];

        if (!origin || whitelist.includes(origin)) {
          callback(null, true);
        } else {
          callback(new ForbiddenException('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Accept, Authorization',
    },
  });

  // Middlewares

  // Enable cookie parsing
  app.use(cookieParser());

  // Enable gzip compression
  app.use(
    compression({
      // Only compress responses larger than 1kb
      threshold: 1024,
      // Default level is 6 (balance of speed vs. size)
      level: 6,
    }),
  );

  // Guards
  app.useGlobalGuards(new BotDetectionGuard());

  // Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // transforms data types
      whitelist: true, // strips any unwanted properties
      forbidNonWhitelisted: true, // throws error on unwanted properties
      transformOptions: {
        enableImplicitConversion: true, // enables type conversion
      },
    }),
  );

  // Interceptors
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  // Filters
  const logger = await app.resolve(PinoLogger);
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // Enable swagger
  const config = new DocumentBuilder()
    .setTitle('Vicky Mart API')
    .setDescription('The Vicky Mart E-commerce API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.set('trust proxy', 1);

  await app.listen(process.env.PORT || 3000);
}

bootstrap()
  .then(() => console.log('[Nest] server started on port', process.env.PORT || 3000))
  .catch(console.error);
