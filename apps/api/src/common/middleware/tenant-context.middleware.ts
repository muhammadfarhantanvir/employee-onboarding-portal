import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../http.types';
import { WorkspaceStore } from '../../workspace/workspace.store';
import { normalizeSlug } from '../utils/validation';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly workspaceStore: WorkspaceStore) {}

  use(
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ): void {
    const tenant = this.resolveTenantSlug(request);
    if (tenant) {
      request.requestedTenantSlug = tenant.slug;
      const company = this.workspaceStore.findCompanyBySlug(tenant.slug);
      if (company) {
        request.tenant = {
          companyId: company.id,
          slug: company.slug,
          source: tenant.source,
        };
      }
    }

    next();
  }

  private resolveTenantSlug(
    request: AuthenticatedRequest,
  ): { slug: string; source: 'header' | 'host' | 'query' } | undefined {
    const headerSlug = this.headerValue(request.headers['x-company-slug']);
    if (headerSlug) {
      return { slug: normalizeSlug(headerSlug, 'x-company-slug'), source: 'header' };
    }

    const querySlug = this.queryValue(request.query.companySlug);
    if (querySlug) {
      return { slug: normalizeSlug(querySlug, 'companySlug'), source: 'query' };
    }

    const hostSlug = this.slugFromHost(request.headers.host);
    if (hostSlug) {
      return { slug: normalizeSlug(hostSlug, 'host subdomain'), source: 'host' };
    }

    return undefined;
  }

  private headerValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private queryValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      const first = value[0];
      return typeof first === 'string' ? first : undefined;
    }
    return typeof value === 'string' ? value : undefined;
  }

  private slugFromHost(host: string | undefined): string | undefined {
    if (!host) {
      return undefined;
    }

    const hostname = host.split(':')[0].toLowerCase();
    const labels = hostname.split('.');
    if (labels.length < 2) {
      return undefined;
    }

    const firstLabel = labels[0];
    if (['api', 'app', 'www'].includes(firstLabel)) {
      return undefined;
    }

    if (hostname.endsWith('.onboarding-portal.com')) {
      return firstLabel;
    }

    if (hostname.endsWith('.localhost')) {
      return firstLabel;
    }

    return undefined;
  }
}
