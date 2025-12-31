import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

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
      {
        status,
        path: request.url,
        method: request.method,
        message,
        stack,
      },
      isHttpException ? 'HTTP Exception' : 'Unexpected System Error',
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message[0] : message,
    });
  }
}
