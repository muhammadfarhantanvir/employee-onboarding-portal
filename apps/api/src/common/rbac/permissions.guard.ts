import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '../http.types';
import { hasPermission, Permission } from './rbac.constants';
import {
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from './permissions.decorator';

/**
 * Guard to enforce permission-based access control
 * Works in conjunction with @RequirePermissions and @RequireAnyPermission decorators
 * Enforces permissions at the API level (in addition to database-level RLS policies)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const anyOfPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ANY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    // No permissions required, allow
    if (requiredPermissions.length === 0 && anyOfPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.authUser;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check AND permissions (user must have ALL)
    if (requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        hasPermission(user.role, permission as Permission),
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    // Check OR permissions (user must have AT LEAST ONE)
    if (anyOfPermissions.length > 0) {
      const hasAnyPermission = anyOfPermissions.some((permission) =>
        hasPermission(user.role, permission as Permission),
      );

      if (!hasAnyPermission) {
        throw new ForbiddenException(
          `Insufficient permissions. Need one of: ${anyOfPermissions.join(', ')}`,
        );
      }
    }

    return true;
  }
}
