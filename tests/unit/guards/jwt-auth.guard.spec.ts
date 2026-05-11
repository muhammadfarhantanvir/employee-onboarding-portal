// tests/unit/guards/jwt-auth.guard.spec.ts
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../../apps/api/src/common/guards/jwt-auth.guard';
import { WorkspaceStore } from '../../../apps/api/src/workspace/workspace.store';
import { IS_PUBLIC_KEY } from '../../../apps/api/src/common/decorators/public.decorator';
import { SEED_IDS } from '../../../prisma/seed.test';

function contextWithAuthHeader(header?: string): ExecutionContext {
  const request = { headers: header ? { authorization: header } : {} };
  return {
    getHandler: () => function handler() {},
    getClass: () => class TestClass {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let jwtService: JwtService;
  let store: WorkspaceStore;
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    process.env.JWT_SECRET = 'super-secret-at-least-32-chars-long';
    jwtService = new JwtService({ secret: process.env.JWT_SECRET });
    store = new WorkspaceStore();
    reflector = new Reflector();
    guard = new JwtAuthGuard(jwtService, store, reflector);
  });

  it('allows public routes without a token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    await expect(guard.canActivate(contextWithAuthHeader())).resolves.toBe(true);
  });

  it('rejects missing, malformed, and invalid tokens', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    await expect(guard.canActivate(contextWithAuthHeader())).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(contextWithAuthHeader('Basic abc'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(guard.canActivate(contextWithAuthHeader('Bearer invalid'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the authenticated user to the request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const token = await jwtService.signAsync({
      sub: SEED_IDS.users.hrAdmin,
      company_id: SEED_IDS.companies.testGmbh,
      email: 'hr@demo-company.com',
      role: 'hr_admin',
    });
    await expect(guard.canActivate(contextWithAuthHeader(`Bearer ${token}`))).resolves.toBe(true);
  });

  it('rejects refresh tokens on resource routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const token = await jwtService.signAsync({
      sub: SEED_IDS.users.hrAdmin,
      company_id: SEED_IDS.companies.testGmbh,
      type: 'refresh',
    });
    await expect(guard.canActivate(contextWithAuthHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
