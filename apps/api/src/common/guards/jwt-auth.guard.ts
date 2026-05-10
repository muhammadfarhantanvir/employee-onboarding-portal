import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from '../http.types';
import { WorkspaceStore } from '../../workspace/workspace.store';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface AccessTokenPayload {
  sub?: unknown;
  email?: unknown;
  role?: unknown;
  company_id?: unknown;
  companyId?: unknown;
  company_slug?: unknown;
  companySlug?: unknown;
  type?: unknown;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly workspaceStore: WorkspaceStore,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = await this.verifyAccessToken(token);
    const userId = this.readPayloadString(payload.sub, 'sub');
    const companyId = this.readPayloadString(
      payload.company_id ?? payload.companyId,
      'company_id',
    );
    const company = this.workspaceStore.findCompanyById(companyId);
    const user = this.workspaceStore.findUserInCompany(companyId, userId);

    if (!company || !user || !user.isActive) {
      throw new UnauthorizedException('User is not active in this company');
    }

    request.authUser = {
      id: user.id,
      companyId: company.id,
      companySlug: company.slug,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isOwner: company.ownerUserId === user.id,
    };
    request.companyId = company.id;

    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | undefined {
    const header = request.headers.authorization;
    if (!header) {
      return undefined;
    }

    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
        },
      );
      if (payload.type === 'refresh') {
        throw new UnauthorizedException('Refresh token cannot access resources');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid bearer token');
    }
  }

  private readPayloadString(value: unknown, key: string): string {
    if (typeof value !== 'string' || !value) {
      throw new UnauthorizedException(`Invalid ${key} claim`);
    }
    return value;
  }
}
