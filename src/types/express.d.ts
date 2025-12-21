import { JwtPayload } from 'src/core/auth/strategies/jwt-auth.strategy';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
