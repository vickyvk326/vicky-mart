import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { error } from 'console';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    if (request.url.includes('com.chrome.devtools.json')) {
      return;
    }

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = isHttpException
      ? typeof exceptionResponse === 'object'
        ? (exceptionResponse as { message: string | string[] }).message || JSON.stringify(exceptionResponse)
        : exceptionResponse
      : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `${request.ip} [${request.method}] ${request.url}${stack ? ` | ERROR: ${stack}` : 'Unknown error. Stack trace not available.'}`,
    );

    response.status(status).send({
      success: false,
      timestamp: new Date().toISOString(),
      statusCode: status,
      path: request.url,
      error: {
        message: Array.isArray(message) ? message : [message],
        type:
          exception instanceof HttpException || exception instanceof ThrottlerException
            ? exception.constructor.name
            : 'InternalServerErrorException',
      },
    });
  }
}
