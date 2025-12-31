import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { type Request } from 'express';
import { JwtUserType } from 'src/core/auth/strategies/jwt-auth.strategy';

export const GetUser = createParamDecorator(
  <K extends keyof JwtUserType>(
    data: K | undefined,
    ctx: ExecutionContext,
  ): JwtUserType | JwtUserType[K] | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as JwtUserType | undefined;

    if (!user) return undefined;

    const value = data ? user[data] : user;
    return value;
  },
);
