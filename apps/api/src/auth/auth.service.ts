import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  createHash,
  pbkdf2Sync,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { AuthenticatedRequest } from '../common/http.types';
import {
  emailDomain,
  normalizeBrandColor,
  normalizeDomain,
  normalizeEmail,
  normalizeSlug,
  normalizeTimezone,
  readBillingPlan,
  readLocale,
  readOptionalString,
  readRequiredString,
  requireBody,
  slugFromName,
} from '../common/utils/validation';
import { WorkspaceStore } from '../workspace/workspace.store';
import {
  AuthenticatedUser,
  BillingPlan,
  Company,
  CompanyResponse,
  MemberResponse,
  User,
} from '../workspace/workspace.types';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

interface AuthResponse extends TokenPair {
  user: MemberResponse;
  company: CompanyResponse;
}

interface RefreshTokenPayload {
  sub?: unknown;
  company_id?: unknown;
  jti?: unknown;
  type?: unknown;
}

interface PasswordHash {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
}

const PASSWORD_ITERATIONS = 120000;

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn = process.env.JWT_EXPIRY ?? '15m';
  private readonly refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRY ?? '7d';

  constructor(
    private readonly jwtService: JwtService,
    private readonly workspaceStore: WorkspaceStore,
  ) {}

  async register(bodyValue: unknown): Promise<AuthResponse> {
    const body = requireBody(bodyValue);
    const companyName = readRequiredString(body, 'companyName', {
      min: 2,
      max: 200,
    });
    const adminEmail = normalizeEmail(
      readRequiredString(body, 'adminEmail', { max: 255 }),
      'adminEmail',
    );
    const adminName = readRequiredString(body, 'adminName', {
      min: 2,
      max: 200,
    });
    const password = readRequiredString(body, 'password', { min: 8, max: 200 });
    const slug = normalizeSlug(
      readOptionalString(body, 'slug', { max: 63 }) ?? slugFromName(companyName),
    );
    const adminDomain = emailDomain(adminEmail);
    const domain = normalizeDomain(
      readOptionalString(body, 'domain', { max: 255 }) ??
        readOptionalString(body, 'companyDomain', { max: 255 }) ??
        adminDomain,
    );

    if (domain !== adminDomain) {
      throw new BadRequestException(
        'Admin email must belong to the company domain for initial verification',
      );
    }

    const workspace = this.workspaceStore.createWorkspace({
      companyName,
      slug,
      domain,
      brandColor: normalizeBrandColor(
        readOptionalString(body, 'brandColor') ?? '#0F172A',
      ),
      timezone: normalizeTimezone(
        readOptionalString(body, 'timezone') ?? 'Europe/Berlin',
      ),
      locale: readLocale(body, 'locale', 'de-DE'),
      plan: readBillingPlan(body, 'plan', BillingPlan.FREE),
      adminEmail,
      adminName,
      ...this.hashPassword(password),
    });

    return this.authResponse(workspace.owner, workspace.company);
  }

  async login(
    bodyValue: unknown,
    request: AuthenticatedRequest,
  ): Promise<AuthResponse> {
    const body = requireBody(bodyValue);
    const email = normalizeEmail(readRequiredString(body, 'email', { max: 255 }));
    const password = readRequiredString(body, 'password', { min: 1, max: 200 });
    const requestedSlug =
      readOptionalString(body, 'companySlug', { max: 63 }) ??
      request.requestedTenantSlug;
    const user = this.findLoginUser(email, requestedSlug);

    if (
      !user.passwordHash ||
      !user.passwordSalt ||
      !this.verifyPassword(password, user)
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Member has not accepted the invite');
    }

    const company = this.workspaceStore.requireCompany(user.companyId);
    return this.authResponse(user, company);
  }

  async refresh(bodyValue: unknown): Promise<AuthResponse> {
    const body = requireBody(bodyValue);
    const refreshToken = readRequiredString(body, 'refreshToken', { min: 20 });
    const payload = await this.verifyRefreshToken(refreshToken);
    const sessionId = this.readPayloadString(payload.jti, 'jti');
    const userId = this.readPayloadString(payload.sub, 'sub');
    const companyId = this.readPayloadString(payload.company_id, 'company_id');
    const session = this.workspaceStore.findRefreshSession(sessionId);
    const tokenHash = this.hashToken(refreshToken);

    if (
      !session ||
      session.userId !== userId ||
      session.companyId !== companyId ||
      session.tokenHash !== tokenHash
    ) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    this.workspaceStore.deleteRefreshSession(sessionId);
    const user = this.workspaceStore.requireUserInCompany(companyId, userId);
    if (!user.isActive) {
      throw new UnauthorizedException('Member is inactive');
    }
    const company = this.workspaceStore.requireCompany(companyId);

    return this.authResponse(user, company);
  }

  async logout(bodyValue: unknown, user: AuthenticatedUser): Promise<{
    success: true;
  }> {
    const body = requireBody(bodyValue ?? {});
    const refreshToken = readOptionalString(body, 'refreshToken');

    if (refreshToken) {
      const payload = await this.verifyRefreshToken(refreshToken);
      const sessionId = this.readPayloadString(payload.jti, 'jti');
      this.workspaceStore.deleteRefreshSession(sessionId);
    } else {
      this.workspaceStore.deleteRefreshSessionsForUser(user.id);
    }

    return { success: true };
  }

  me(user: AuthenticatedUser): {
    user: MemberResponse;
    company: CompanyResponse;
  } {
    const company = this.workspaceStore.requireCompany(user.companyId);
    const member = this.workspaceStore.requireUserInCompany(company.id, user.id);
    return {
      user: this.workspaceStore.memberResponse(member),
      company: this.workspaceStore.companyResponse(company),
    };
  }

  async acceptInvite(bodyValue: unknown): Promise<AuthResponse> {
    const body = requireBody(bodyValue);
    const token = readRequiredString(body, 'token', { min: 20 });
    const password = readRequiredString(body, 'password', { min: 8, max: 200 });
    const accepted = this.workspaceStore.acceptInvitation(
      token,
      this.hashPassword(password),
    );

    return this.authResponse(accepted.member, accepted.company);
  }

  private findLoginUser(email: string, requestedSlug: string | undefined): User {
    if (requestedSlug) {
      const company = this.workspaceStore.findCompanyBySlug(
        normalizeSlug(requestedSlug, 'companySlug'),
      );
      if (!company) {
        throw new UnauthorizedException('Unknown company workspace');
      }
      const user = this.workspaceStore.findUserByEmailInCompany(company.id, email);
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }
      return user;
    }

    const users = this.workspaceStore.findUsersByEmail(email);
    if (users.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (users.length > 1) {
      throw new ConflictException('companySlug is required for this email');
    }
    return users[0];
  }

  private async authResponse(user: User, company: Company): Promise<AuthResponse> {
    const tokens = await this.issueTokens(user, company);
    return {
      ...tokens,
      user: this.workspaceStore.memberResponse(user),
      company: this.workspaceStore.companyResponse(company),
    };
  }

  private async issueTokens(user: User, company: Company): Promise<TokenPair> {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      company_id: company.id,
      companyId: company.id,
      company_slug: company.slug,
      companySlug: company.slug,
    };
    const refreshSessionId = randomUUID();
    const refreshPayload = {
      sub: user.id,
      company_id: company.id,
      jti: refreshSessionId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
        expiresIn: this.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
        expiresIn: this.refreshTokenExpiresIn,
      }),
    ]);

    this.workspaceStore.saveRefreshSession({
      id: refreshSessionId,
      userId: user.id,
      companyId: company.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.refreshExpiryDate().toISOString(),
      createdAt: new Date().toISOString(),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        {
          secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
        },
      );
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private hashPassword(password: string): PasswordHash {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(
      password,
      salt,
      PASSWORD_ITERATIONS,
      32,
      'sha256',
    ).toString('hex');

    return {
      passwordHash: hash,
      passwordSalt: salt,
      passwordIterations: PASSWORD_ITERATIONS,
    };
  }

  private verifyPassword(password: string, user: User): boolean {
    if (!user.passwordHash || !user.passwordSalt) {
      return false;
    }

    const actual = pbkdf2Sync(
      password,
      user.passwordSalt,
      user.passwordIterations,
      32,
      'sha256',
    );
    const expected = Buffer.from(user.passwordHash, 'hex');

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiryDate(): Date {
    const expiry = this.refreshTokenExpiresIn;
    const match = /^(\d+)([smhd])$/.exec(expiry);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multiplier =
      unit === 's'
        ? 1000
        : unit === 'm'
          ? 60 * 1000
          : unit === 'h'
            ? 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;
    return new Date(Date.now() + amount * multiplier);
  }

  private readPayloadString(value: unknown, key: string): string {
    if (typeof value !== 'string' || !value) {
      throw new UnauthorizedException(`Invalid ${key} claim`);
    }
    return value;
  }
}
