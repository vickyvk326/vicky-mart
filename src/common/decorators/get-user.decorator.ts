import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from 'src/core/auth/strategies/jwt-auth.strategy';

export const GetUser = createParamDecorator((data: keyof JwtPayload, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  if (data) {
    return user[data]; // e.g., @GetUser('id')
  }
  return user; // returns the whole user object
});
