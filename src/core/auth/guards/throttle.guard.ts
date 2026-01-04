import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const user = req.user;
    const trackerId = user?.id || req.ip || 'anonymous';
    return Promise.resolve(trackerId);
  }
}
