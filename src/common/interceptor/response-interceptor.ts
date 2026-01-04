import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, StreamableFile } from '@nestjs/common';
import { CLASS_SERIALIZER_OPTIONS } from '@nestjs/common/serializer/class-serializer.constants';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ClassTransformOptions, instanceToPlain } from 'class-transformer';
import type { Request } from 'express';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP_RESPONSE');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = req;

    return next.handle().pipe(
      // Performance Logging
      tap(() => {
        this.logger.log(`${ip} [${method}] ${url} - ${Date.now() - now}ms`);
      }),

      // Unified Response Transformation
      map((data: unknown) => {
        const isStream = data instanceof StreamableFile;
        const isAlreadyWrapped = typeof data === 'object' && data !== null && 'success' in data;
        if (isStream || isAlreadyWrapped) {
          return data;
        }

        const options = this.reflector.getAllAndOverride<ClassTransformOptions>(CLASS_SERIALIZER_OPTIONS, [
          context.getHandler(),
          context.getClass(),
        ]);

        const cleanedData = instanceToPlain(data, options);

        return {
          success: true,
          timestamp: new Date().toISOString(),
          data: cleanedData,
        };
      }),
    );
  }
}
