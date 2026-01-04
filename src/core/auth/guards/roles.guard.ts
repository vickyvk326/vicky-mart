import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/modules/users/enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get the required roles from the decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. If no roles are required, let the request pass
    if (!requiredRoles) {
      return true;
    }

    // 3. Get the user from the request (attached earlier by your JWT/Auth Guard)
    const request = context.switchToHttp().getRequest<Request>();

    const user = request.user;

    if (!user || !user) {
      throw new ForbiddenException('User role not identified');
    }

    // 4. Check if user has one of the required roles
    const hasRoleBasedAccess = requiredRoles.some((role) => user.role === role);

    if (!hasRoleBasedAccess) {
      throw new ForbiddenException(`You need ${requiredRoles.join(', ')} permissions to access this resource.`);
    }

    return true;
  }
}
