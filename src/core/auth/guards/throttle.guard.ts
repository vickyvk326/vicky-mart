import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: FastifyRequest): Promise<string> {
    const user = req.user;
    const trackerId = user?.id || req.ip || 'anonymous';
    return Promise.resolve(trackerId);
  }
}
