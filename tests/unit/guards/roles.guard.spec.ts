// tests/unit/guards/roles.guard.spec.ts
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../../../apps/api/src/common/rbac/permissions.guard';
import { Permission } from '../../../apps/api/src/common/rbac/rbac.constants';

function contextForRole(role: string): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class TestClass {},
    switchToHttp: () => ({
      getRequest: () => ({
        authUser: {
          id: 'user-id',
          companyId: 'company-id',
          role,
        },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let reflector: Reflector;
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('allows public routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    expect(guard.canActivate(contextForRole('viewer'))).toBe(true);
  });

  it('allows routes without required permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false).mockReturnValueOnce([]).mockReturnValueOnce([]);
    expect(guard.canActivate(contextForRole('viewer'))).toBe(true);
  });

  it('allows a role with all required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([Permission.VIEW_ALL_HIRES])
      .mockReturnValueOnce([]);
    expect(guard.canActivate(contextForRole('hr_admin'))).toBe(true);
  });

  it('rejects a role without required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([Permission.MANAGE_COMPANY_SETTINGS])
      .mockReturnValueOnce([]);
    expect(() => guard.canActivate(contextForRole('viewer'))).toThrow('Insufficient permissions');
  });

  it('supports any-of permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([])
      .mockReturnValueOnce([Permission.VIEW_ANALYTICS, Permission.MANAGE_GDPR]);
    expect(guard.canActivate(contextForRole('viewer'))).toBe(true);
  });
});
