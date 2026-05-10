import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../http.types';

@Injectable()
export class CompanyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.authUser;

    if (!user) {
      throw new ForbiddenException('Authenticated user context is required');
    }

    const requestedCompanyId =
      this.readString(request.params.companyId) ??
      this.readString(request.params.company_id) ??
      this.readString(request.query.companyId) ??
      this.readString(request.query.company_id) ??
      this.readBodyCompanyId(request.body);

    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('Requested company does not match token tenant');
    }

    if (request.tenant && request.tenant.companyId !== user.companyId) {
      throw new ForbiddenException('Subdomain does not match token tenant');
    }

    request.companyId = user.companyId;
    return true;
  }

  private readBodyCompanyId(body: unknown): string | undefined {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return undefined;
    }
    const record = body as Record<string, unknown>;
    return (
      this.readString(record.companyId) ?? this.readString(record.company_id)
    );
  }

  private readString(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }
    return value.trim();
  }
}
