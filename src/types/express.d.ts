import { JwtUserType } from 'src/core/auth/strategies/jwt-auth.strategy';
import { UserRole } from 'src/modules/users/enums/user-role.enum';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserType;
    }
    interface User {
      id: string;
      email: string;
      role: UserRole;
    }
  }
}
