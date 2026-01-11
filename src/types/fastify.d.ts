import { FastifyRequest } from 'fastify';
import { JwtUserType } from '../core/auth/strategies/jwt-auth.strategy';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtUserType;
  }
}
