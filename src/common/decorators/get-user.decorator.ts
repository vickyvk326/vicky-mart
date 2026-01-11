import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtUserType } from 'src/core/auth/strategies/jwt-auth.strategy';

type userKey = keyof JwtUserType;

export const GetUser = createParamDecorator(
  (data: userKey | undefined, ctx: ExecutionContext): JwtUserType | JwtUserType[userKey] | undefined => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();

    // Cast 'user' to your specific type to remove 'any' or 'unsafe' warnings
    const user = request.user;

    if (!user) return undefined;

    // If data (key) is provided, return that specific property, else return the whole user
    return data ? user[data] : user;
  },
);
