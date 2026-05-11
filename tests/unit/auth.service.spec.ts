// tests/unit/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from '../../apps/api/src/auth/auth.service';
import { WorkspaceStore } from '../../apps/api/src/workspace/workspace.store';

describe('AuthService', () => {
  let moduleRef: TestingModule;
  let service: AuthService;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'super-secret-at-least-32-chars-long';
    process.env.JWT_REFRESH_SECRET = 'super-secret-refresh-at-least-32-chars-long';
    moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
      providers: [AuthService, WorkspaceStore],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('login', () => {
    it('returns access and refresh tokens for a valid user', async () => {
      const response = await service.login(
        { email: 'hr@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
        { headers: {}, requestedTenantSlug: undefined } as never,
      );

      expect(response.accessToken).toEqual(expect.any(String));
      expect(response.refreshToken).toEqual(expect.any(String));
      expect(response.user.role).toBe('hr_admin');
    });

    it('rejects invalid credentials', async () => {
      await expect(
        service.login(
          { email: 'hr@demo-company.com', password: 'wrong', companySlug: 'demo-company' },
          { headers: {} } as never,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects malformed request bodies', async () => {
      await expect(service.login(null, { headers: {} } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('register', () => {
    it('creates a workspace and owner account', async () => {
      const unique = Date.now();
      const response = await service.register({
        companyName: `Unit ${unique} GmbH`,
        adminName: 'Unit Admin',
        adminEmail: `admin@unit-${unique}.test`,
        password: 'Test1234!',
        domain: `unit-${unique}.test`,
      });

      expect(response.company.slug).toContain(`unit-${unique}`);
      expect(response.user.role).toBe('hr_admin');
    });

    it('rejects duplicate company slugs', async () => {
      const body = {
        companyName: 'Duplicate GmbH',
        slug: 'duplicate-gmbh',
        adminName: 'Duplicate Admin',
        adminEmail: 'admin@duplicate.test',
        password: 'Test1234!',
        domain: 'duplicate.test',
      };
      await service.register(body);
      await expect(service.register({ ...body, adminEmail: 'owner@duplicate.test' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('refresh/logout/me', () => {
    it('rotates refresh tokens and revokes sessions on logout', async () => {
      const login = await service.login(
        { email: 'manager@demo-company.com', password: 'Demo1234!', companySlug: 'demo-company' },
        { headers: {} } as never,
      );
      const refreshed = await service.refresh({ refreshToken: login.refreshToken });

      expect(refreshed.accessToken).toEqual(expect.any(String));
      await expect(service.refresh({ refreshToken: login.refreshToken })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(service.logout({}, refreshed.user as never)).resolves.toEqual({ success: true });
    });
  });
});
