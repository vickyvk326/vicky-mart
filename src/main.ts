import fastifyCookie from '@fastify/cookie';
import { ClassSerializerInterceptor, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { Logger, PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { BotDetectionGuard } from './common/guards/bot-detection.guard';
import { ResponseInterceptor } from './common/interceptor/response-interceptor';
import { MikroORM } from '@mikro-orm/core';

async function bootstrap() {
  // Initialize nestjs app
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
    }),
    {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
      bufferLogs: true,
      cors: {
        origin: (origin, callback) => {
          const whitelist = ['http://localhost:3000', 'http://localhost:5173'];

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
    },
  );

  app.useLogger(app.get(Logger));

  await app.register(fastifyCookie, {
    parseOptions: {
      httpOnly: true, // Prevents XSS for your JWT tokens
      secure: process.env.NODE_ENV === 'production',
    },
  });

  // Enable gzip compression
  app.use(
    compression({
      threshold: 1024, // Only compress responses larger than 1kb
      level: 6, // Default level is 6 (balance of speed vs. size)
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

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

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

  app.enableShutdownHooks();

  const orm = app.get(MikroORM);
  await orm.schema.updateSchema();

  await app.listen(process.env.PORT || 3000);
}

bootstrap().catch(console.error);
