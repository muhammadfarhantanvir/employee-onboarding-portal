import { SetMetadata } from '@nestjs/common';
import { Permission } from './rbac.constants';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 * Checks if the user has ALL of the specified permissions (AND logic)
 *
 * @example
 * @RequirePermissions(Permission.VIEW_ALL_HIRES, Permission.APPROVE_ONBOARDING)
 * @Get('hires')
 * getHires() { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator to specify required permissions with OR logic
 * User needs to have at least one of the specified permissions
 *
 * @example
 * @RequireAnyPermission(Permission.MANAGE_DOCUMENTS, Permission.UPLOAD_OWN_DOCUMENTS)
 * @Post('documents')
 * uploadDocument() { ... }
 */
export const PERMISSIONS_ANY_KEY = 'permissions_any';
export const RequireAnyPermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);
