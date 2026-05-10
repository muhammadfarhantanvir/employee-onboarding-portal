import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  emailDomain,
  normalizeBrandColor,
  normalizeDomain,
  normalizeEmail,
  normalizeSlug,
  normalizeTimezone,
  normalizeUrl,
  readBillingPlan,
  readBoolean,
  readLocale,
  readOptionalString,
  readRequiredString,
  readRole,
  requireBody,
} from '../common/utils/validation';
import { WorkspaceStore } from '../workspace/workspace.store';
import {
  AuthenticatedUser,
  BillingPlan,
  BillingResponse,
  CompanyResponse,
  DomainVerificationChallengeResponse,
  MemberResponse,
  Role,
  WorkspaceAvailabilityResponse,
} from '../workspace/workspace.types';
import { hasPermission, Permission } from '../common/rbac';

@Injectable()
export class CompanyService {
  constructor(private readonly workspaceStore: WorkspaceStore) {}

  checkAvailability(
    slugValue?: unknown,
    domainValue?: unknown,
  ): WorkspaceAvailabilityResponse {
    const response: WorkspaceAvailabilityResponse = {};
    const slug = this.queryValue(slugValue);
    const domain = this.queryValue(domainValue);

    if (!slug && !domain) {
      throw new BadRequestException('slug or domain query parameter is required');
    }

    if (slug) {
      const normalizedSlug = normalizeSlug(slug);
      response.slug = {
        value: normalizedSlug,
        available: this.workspaceStore.isSlugAvailable(normalizedSlug),
      };
    }

    if (domain) {
      const normalizedDomain = normalizeDomain(domain);
      response.domain = {
        value: normalizedDomain,
        available: this.workspaceStore.isDomainAvailable(normalizedDomain),
      };
    }

    return response;
  }

  resolveWorkspace(slugValue: string): { company: CompanyResponse } {
    const slug = normalizeSlug(slugValue);
    const company = this.workspaceStore.findCompanyBySlug(slug);
    if (!company) {
      throw new NotFoundException('Company workspace was not found');
    }
    return {
      company: this.workspaceStore.companyResponse(company),
    };
  }

  getCompany(companyId: string): { company: CompanyResponse } {
    const company = this.workspaceStore.requireCompany(companyId);
    return {
      company: this.workspaceStore.companyResponse(company),
    };
  }

  updateCompany(
    companyId: string,
    user: AuthenticatedUser,
    bodyValue: unknown,
  ): { company: CompanyResponse } {
    if (!hasPermission(user.role, Permission.MANAGE_COMPANY_SETTINGS)) {
      throw new ForbiddenException(
        'Insufficient permissions to manage company settings',
      );
    }

    const body = requireBody(bodyValue);
    const updates = {
      name: readOptionalString(body, 'name', { min: 2, max: 200 }),
      slug: this.optionalSlug(body),
      domain: this.optionalVerifiedDomain(body, user.email),
      logoUrl: this.optionalLogoUrl(body),
      brandColor: this.optionalBrandColor(body),
      timezone: this.optionalTimezone(body),
      locale: readLocale(body, 'locale'),
      plan: readBillingPlan(body, 'plan'),
    };
    const compactUpdates = Object.fromEntries(
      Object.entries(updates).filter((entry) => entry[1] !== undefined),
    );

    if (Object.keys(compactUpdates).length === 0) {
      throw new BadRequestException('At least one company setting is required');
    }

    if (compactUpdates.domain) {
      compactUpdates.domainVerifiedAt = new Date().toISOString();
      compactUpdates.pendingDomain = null;
      compactUpdates.domainVerificationTokenHash = null;
      compactUpdates.domainVerificationExpiresAt = null;
    }

    const company = this.workspaceStore.updateCompany(companyId, compactUpdates);
    return {
      company: this.workspaceStore.companyResponse(company),
    };
  }

  requestDomainVerification(
    companyId: string,
    bodyValue: unknown,
  ): DomainVerificationChallengeResponse {
    const body = requireBody(bodyValue ?? {});
    const company = this.workspaceStore.requireCompany(companyId);
    const requestedDomain =
      readOptionalString(body, 'domain', { max: 255 }) ?? company.domain;
    const domain = normalizeDomain(requestedDomain);

    return this.workspaceStore.createDomainVerificationChallenge(
      companyId,
      domain,
    );
  }

  verifyDomain(
    companyId: string,
    bodyValue: unknown,
  ): { company: CompanyResponse } {
    const body = requireBody(bodyValue);
    const token = readRequiredString(body, 'token', { min: 20 });
    const company = this.workspaceStore.verifyDomainChallenge(companyId, token);
    return {
      company: this.workspaceStore.companyResponse(company),
    };
  }

  getBilling(companyId: string): { billing: BillingResponse } {
    const company = this.workspaceStore.requireCompany(companyId);
    return {
      billing: this.workspaceStore.billingResponse(company),
    };
  }

  updateBillingPlan(
    companyId: string,
    bodyValue: unknown,
  ): { billing: BillingResponse; company: CompanyResponse } {
    const body = requireBody(bodyValue);
    const plan = readBillingPlan(body, 'plan');
    if (!plan) {
      throw new BadRequestException('plan is required');
    }

    if (
      plan === BillingPlan.FREE &&
      !this.workspaceStore.canAddActiveHire(
        companyId,
        this.workspaceStore.getActiveHireCount(companyId),
      )
    ) {
      throw new BadRequestException(
        'Cannot downgrade to Free while the workspace has more than 5 active hires',
      );
    }

    const company = this.workspaceStore.updateCompany(companyId, { plan });
    return {
      billing: this.workspaceStore.billingResponse(company),
      company: this.workspaceStore.companyResponse(company),
    };
  }

  updateLogo(companyId: string, bodyValue: unknown): { company: CompanyResponse } {
    const body = requireBody(bodyValue);
    const logoUrl = normalizeUrl(readRequiredString(body, 'logoUrl'), 'logoUrl');
    const company = this.workspaceStore.updateCompany(companyId, { logoUrl });
    return {
      company: this.workspaceStore.companyResponse(company),
    };
  }

  listMembers(companyId: string): { members: MemberResponse[] } {
    return {
      members: this.workspaceStore
        .listCompanyMembers(companyId)
        .map((member) => this.workspaceStore.memberResponse(member)),
    };
  }

  inviteMember(
    companyId: string,
    user: AuthenticatedUser,
    bodyValue: unknown,
  ): {
    member: MemberResponse;
    inviteToken: string;
    expiresAt: string;
  } {
    if (!hasPermission(user.role, Permission.MANAGE_TEAM_MEMBERS)) {
      throw new ForbiddenException(
        'Insufficient permissions to invite company members',
      );
    }

    const body = requireBody(bodyValue);
    const email = normalizeEmail(readRequiredString(body, 'email', { max: 255 }));
    const fullName = readRequiredString(body, 'fullName', {
      min: 2,
      max: 200,
    });
    const role = readRole(body, 'role', Role.VIEWER);
    const externalAllowed = readBoolean(body, 'allowExternalDomain') ?? false;
    const company = this.workspaceStore.requireCompany(companyId);

    if (!externalAllowed && emailDomain(email) !== company.domain) {
      throw new BadRequestException(
        'Invite email must match the verified company domain unless allowExternalDomain is true',
      );
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const invitation = this.workspaceStore.createInvitation({
      companyId,
      email,
      fullName,
      role,
      invitedByUserId: user.id,
      expiresAt,
    });

    return {
      member: this.workspaceStore.memberResponse(invitation.member),
      inviteToken: invitation.invitation.token,
      expiresAt,
    };
  }

  changeMemberRole(
    companyId: string,
    userId: string,
    bodyValue: unknown,
  ): { member: MemberResponse } {
    const body = requireBody(bodyValue);
    const role = readRole(body, 'role');
    const company = this.workspaceStore.requireCompany(companyId);

    if (company.ownerUserId === userId && role !== Role.HR_ADMIN) {
      throw new BadRequestException(
        'Transfer ownership before changing the owner role',
      );
    }

    const member = this.workspaceStore.updateMemberRole(companyId, userId, role);
    return {
      member: this.workspaceStore.memberResponse(member),
    };
  }

  deactivateMember(
    companyId: string,
    currentUser: AuthenticatedUser,
    userId: string,
  ): { member: MemberResponse } {
    const company = this.workspaceStore.requireCompany(companyId);

    if (company.ownerUserId === userId) {
      throw new BadRequestException('Transfer ownership before deactivating owner');
    }
    if (currentUser.id === userId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const member = this.workspaceStore.deactivateMember(companyId, userId);
    return {
      member: this.workspaceStore.memberResponse(member),
    };
  }

  transferOwnership(
    companyId: string,
    currentUser: AuthenticatedUser,
    bodyValue: unknown,
  ): {
    company: CompanyResponse;
    owner: MemberResponse;
  } {
    if (!hasPermission(currentUser.role, Permission.MANAGE_COMPANY_SETTINGS)) {
      throw new ForbiddenException(
        'Insufficient permissions to transfer company ownership',
      );
    }

    const company = this.workspaceStore.requireCompany(companyId);
    if (company.ownerUserId !== currentUser.id) {
      throw new ForbiddenException('Only the current owner can transfer ownership');
    }

    const body = requireBody(bodyValue);
    const newOwnerUserId = readRequiredString(body, 'newOwnerUserId');
    if (newOwnerUserId === currentUser.id) {
      throw new BadRequestException('newOwnerUserId must be a different member');
    }

    const member = this.workspaceStore.requireUserInCompany(
      companyId,
      newOwnerUserId,
    );
    if (!member.isActive) {
      throw new BadRequestException('New owner must be an active member');
    }

    const result = this.workspaceStore.transferOwnership(companyId, newOwnerUserId);
    return {
      company: this.workspaceStore.companyResponse(result.company),
      owner: this.workspaceStore.memberResponse(result.owner),
    };
  }

  private optionalSlug(body: Record<string, unknown>): string | undefined {
    const slug = readOptionalString(body, 'slug', { max: 63 });
    return slug ? normalizeSlug(slug) : undefined;
  }

  private optionalVerifiedDomain(
    body: Record<string, unknown>,
    currentUserEmail: string,
  ): string | undefined {
    const domainInput = readOptionalString(body, 'domain', { max: 255 });
    if (!domainInput) {
      return undefined;
    }

    const domain = normalizeDomain(domainInput);
    if (domain !== emailDomain(currentUserEmail)) {
      throw new BadRequestException(
        'Your email must belong to the new domain to verify it',
      );
    }
    return domain;
  }

  private optionalLogoUrl(body: Record<string, unknown>): string | null | undefined {
    const logoUrl = readOptionalString(body, 'logoUrl');
    if (!logoUrl) {
      return undefined;
    }
    return normalizeUrl(logoUrl, 'logoUrl');
  }

  private optionalBrandColor(
    body: Record<string, unknown>,
  ): string | undefined {
    const brandColor = readOptionalString(body, 'brandColor');
    return brandColor ? normalizeBrandColor(brandColor) : undefined;
  }

  private optionalTimezone(body: Record<string, unknown>): string | undefined {
    const timezone = readOptionalString(body, 'timezone');
    return timezone ? normalizeTimezone(timezone) : undefined;
  }

  private queryValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      const first = value[0];
      return typeof first === 'string' ? first : undefined;
    }
    return typeof value === 'string' ? value : undefined;
  }
}
