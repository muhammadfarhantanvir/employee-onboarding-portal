import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import {
  BillingResponse,
  BillingPlan,
  Company,
  CompanyResponse,
  DomainVerificationChallengeResponse,
  Invitation,
  MemberResponse,
  RefreshSession,
  Role,
  SupportedLocale,
  User,
} from './workspace.types';

interface CreateWorkspaceInput {
  companyName: string;
  slug: string;
  domain: string;
  brandColor: string;
  timezone: string;
  locale: SupportedLocale;
  plan: BillingPlan;
  adminEmail: string;
  adminName: string;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
}

interface CreateInvitationInput {
  companyId: string;
  email: string;
  fullName: string;
  role: Role;
  invitedByUserId: string;
  expiresAt: string;
}

interface SetPasswordInput {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
}

interface UpdateCompanyInput {
  name?: string;
  slug?: string;
  domain?: string;
  domainVerifiedAt?: string | null;
  pendingDomain?: string | null;
  domainVerificationTokenHash?: string | null;
  domainVerificationExpiresAt?: string | null;
  logoUrl?: string | null;
  brandColor?: string;
  timezone?: string;
  locale?: SupportedLocale;
  plan?: BillingPlan;
}

@Injectable()
export class WorkspaceStore {
  private readonly companies = new Map<string, Company>();
  private readonly users = new Map<string, User>();
  private readonly invitations = new Map<string, Invitation>();
  private readonly refreshSessions = new Map<string, RefreshSession>();
  private readonly activeHireCounts = new Map<string, number>();

  constructor() {
    this.seedDemoWorkspace();
  }

  createWorkspace(input: CreateWorkspaceInput): {
    company: Company;
    owner: User;
  } {
    this.assertSlugAvailable(input.slug);
    this.assertDomainAvailable(input.domain);

    const now = new Date().toISOString();
    const companyId = randomUUID();
    const ownerId = randomUUID();
    const company: Company = {
      id: companyId,
      name: input.companyName,
      slug: input.slug,
      domain: input.domain,
      domainVerifiedAt: now,
      pendingDomain: null,
      domainVerificationTokenHash: null,
      domainVerificationExpiresAt: null,
      logoUrl: null,
      brandColor: input.brandColor,
      timezone: input.timezone,
      locale: input.locale,
      plan: input.plan,
      ownerUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    };
    const owner: User = {
      id: ownerId,
      companyId,
      email: input.adminEmail,
      fullName: input.adminName,
      role: Role.HR_ADMIN,
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
      passwordIterations: input.passwordIterations,
      avatarUrl: null,
      department: 'People',
      jobTitle: 'Company Owner',
      phone: null,
      isActive: true,
      invitedByUserId: null,
      createdAt: now,
      updatedAt: now,
    };

    this.companies.set(company.id, company);
    this.users.set(owner.id, owner);
    this.activeHireCounts.set(company.id, 0);

    return { company, owner };
  }

  findCompanyById(companyId: string): Company | undefined {
    return this.companies.get(companyId);
  }

  findCompanyBySlug(slug: string): Company | undefined {
    return Array.from(this.companies.values()).find(
      (company) => company.slug === slug,
    );
  }

  findUserById(userId: string): User | undefined {
    return this.users.get(userId);
  }

  findUserInCompany(companyId: string, userId: string): User | undefined {
    const user = this.users.get(userId);
    return user?.companyId === companyId ? user : undefined;
  }

  findUsersByEmail(email: string): User[] {
    return Array.from(this.users.values()).filter((user) => user.email === email);
  }

  isSlugAvailable(slug: string, excludingCompanyId?: string): boolean {
    return !Array.from(this.companies.values()).some(
      (company) => company.slug === slug && company.id !== excludingCompanyId,
    );
  }

  isDomainAvailable(domain: string, excludingCompanyId?: string): boolean {
    return !Array.from(this.companies.values()).some(
      (company) =>
        company.id !== excludingCompanyId &&
        (company.domain === domain || company.pendingDomain === domain),
    );
  }

  findUserByEmailInCompany(companyId: string, email: string): User | undefined {
    return Array.from(this.users.values()).find(
      (user) => user.companyId === companyId && user.email === email,
    );
  }

  listCompanyMembers(companyId: string): User[] {
    return Array.from(this.users.values())
      .filter((user) => user.companyId === companyId)
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
  }

  updateCompany(companyId: string, updates: UpdateCompanyInput): Company {
    const company = this.requireCompany(companyId);

    if (updates.slug && updates.slug !== company.slug) {
      this.assertSlugAvailable(updates.slug, companyId);
    }

    if (updates.domain && updates.domain !== company.domain) {
      this.assertDomainAvailable(updates.domain, companyId);
    }

    const updated: Company = {
      ...company,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.companies.set(companyId, updated);
    return updated;
  }

  createDomainVerificationChallenge(
    companyId: string,
    domain: string,
  ): DomainVerificationChallengeResponse {
    this.assertDomainAvailable(domain, companyId);
    const company = this.requireCompany(companyId);
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const updated: Company = {
      ...company,
      pendingDomain: domain,
      domainVerificationTokenHash: this.hashValue(token),
      domainVerificationExpiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
    };

    this.companies.set(companyId, updated);

    return {
      domain,
      verificationToken: token,
      txtRecordName: `_onboarding-portal.${domain}`,
      txtRecordValue: `onboarding-portal-verify=${token}`,
      expiresAt,
    };
  }

  verifyDomainChallenge(companyId: string, token: string): Company {
    const company = this.requireCompany(companyId);
    if (
      !company.pendingDomain ||
      !company.domainVerificationTokenHash ||
      !company.domainVerificationExpiresAt
    ) {
      throw new ConflictException('No domain verification challenge is pending');
    }

    if (new Date(company.domainVerificationExpiresAt).getTime() < Date.now()) {
      throw new ConflictException('Domain verification challenge has expired');
    }

    if (this.hashValue(token) !== company.domainVerificationTokenHash) {
      throw new ConflictException('Domain verification token is invalid');
    }

    this.assertDomainAvailable(company.pendingDomain, companyId);
    const now = new Date().toISOString();
    const updated: Company = {
      ...company,
      domain: company.pendingDomain,
      domainVerifiedAt: now,
      pendingDomain: null,
      domainVerificationTokenHash: null,
      domainVerificationExpiresAt: null,
      updatedAt: now,
    };

    this.companies.set(companyId, updated);
    return updated;
  }

  createInvitation(input: CreateInvitationInput): {
    invitation: Invitation;
    member: User;
  } {
    const company = this.requireCompany(input.companyId);
    const existing = this.findUserByEmailInCompany(input.companyId, input.email);

    if (existing?.isActive) {
      throw new ConflictException('A member with this email already exists');
    }

    const now = new Date().toISOString();
    const member: User =
      existing ??
      {
        id: randomUUID(),
        companyId: company.id,
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        passwordHash: null,
        passwordSalt: null,
        passwordIterations: 0,
        avatarUrl: null,
        department: null,
        jobTitle: null,
        phone: null,
        isActive: false,
        invitedByUserId: input.invitedByUserId,
        createdAt: now,
        updatedAt: now,
      };

    const updatedMember: User = {
      ...member,
      fullName: input.fullName,
      role: input.role,
      isActive: false,
      invitedByUserId: input.invitedByUserId,
      updatedAt: now,
    };
    const invitation: Invitation = {
      token: randomBytes(32).toString('hex'),
      companyId: company.id,
      userId: updatedMember.id,
      email: input.email,
      role: input.role,
      invitedByUserId: input.invitedByUserId,
      acceptedAt: null,
      expiresAt: input.expiresAt,
      createdAt: now,
    };

    this.users.set(updatedMember.id, updatedMember);
    this.invitations.set(invitation.token, invitation);

    return { invitation, member: updatedMember };
  }

  acceptInvitation(token: string, password: SetPasswordInput): {
    company: Company;
    member: User;
  } {
    const invitation = this.invitations.get(token);
    if (!invitation) {
      throw new NotFoundException('Invitation was not found');
    }

    if (invitation.acceptedAt) {
      throw new ConflictException('Invitation has already been accepted');
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      throw new ConflictException('Invitation has expired');
    }

    const member = this.requireUserInCompany(
      invitation.companyId,
      invitation.userId,
    );
    const now = new Date().toISOString();
    const updatedMember: User = {
      ...member,
      role: invitation.role,
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt,
      passwordIterations: password.passwordIterations,
      isActive: true,
      updatedAt: now,
    };
    const updatedInvitation: Invitation = {
      ...invitation,
      acceptedAt: now,
    };

    this.users.set(updatedMember.id, updatedMember);
    this.invitations.set(token, updatedInvitation);

    return {
      company: this.requireCompany(invitation.companyId),
      member: updatedMember,
    };
  }

  updateMemberRole(companyId: string, userId: string, role: Role): User {
    const user = this.requireUserInCompany(companyId, userId);
    const updated: User = {
      ...user,
      role,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  deactivateMember(companyId: string, userId: string): User {
    const user = this.requireUserInCompany(companyId, userId);
    const updated: User = {
      ...user,
      isActive: false,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  transferOwnership(companyId: string, newOwnerUserId: string): {
    company: Company;
    owner: User;
  } {
    const company = this.requireCompany(companyId);
    const newOwner = this.requireUserInCompany(companyId, newOwnerUserId);
    const now = new Date().toISOString();
    const promotedOwner: User = {
      ...newOwner,
      role: Role.HR_ADMIN,
      isActive: true,
      updatedAt: now,
    };
    const updatedCompany: Company = {
      ...company,
      ownerUserId: promotedOwner.id,
      updatedAt: now,
    };

    this.users.set(promotedOwner.id, promotedOwner);
    this.companies.set(companyId, updatedCompany);

    return { company: updatedCompany, owner: promotedOwner };
  }

  getActiveHireLimit(company: Company): number | null {
    return company.plan === BillingPlan.FREE ? 5 : null;
  }

  getActiveHireCount(companyId: string): number {
    return this.activeHireCounts.get(companyId) ?? 0;
  }

  canAddActiveHire(companyId: string, nextActiveHireCount?: number): boolean {
    const company = this.requireCompany(companyId);
    const limit = this.getActiveHireLimit(company);
    if (limit === null) {
      return true;
    }
    const count = nextActiveHireCount ?? this.getActiveHireCount(companyId) + 1;
    return count <= limit;
  }

  assertCanAddActiveHire(companyId: string, nextActiveHireCount?: number): void {
    if (!this.canAddActiveHire(companyId, nextActiveHireCount)) {
      throw new ConflictException('Free workspaces are limited to 5 active hires');
    }
  }

  saveRefreshSession(session: RefreshSession): void {
    this.refreshSessions.set(session.id, session);
  }

  findRefreshSession(sessionId: string): RefreshSession | undefined {
    const session = this.refreshSessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.refreshSessions.delete(sessionId);
      return undefined;
    }

    return session;
  }

  deleteRefreshSession(sessionId: string): void {
    this.refreshSessions.delete(sessionId);
  }

  deleteRefreshSessionsForUser(userId: string): void {
    for (const [sessionId, session] of this.refreshSessions.entries()) {
      if (session.userId === userId) {
        this.refreshSessions.delete(sessionId);
      }
    }
  }

  companyResponse(company: Company): CompanyResponse {
    const activeHireCount = this.getActiveHireCount(company.id);
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      domain: company.domain,
      domainVerifiedAt: company.domainVerifiedAt,
      pendingDomain: company.pendingDomain,
      domainVerificationStatus: this.domainVerificationStatus(company),
      domainVerificationExpiresAt: company.domainVerificationExpiresAt,
      logoUrl: company.logoUrl,
      brandColor: company.brandColor,
      timezone: company.timezone,
      locale: company.locale,
      plan: company.plan,
      activeHireLimit: this.getActiveHireLimit(company),
      activeHireCount,
      ownerUserId: company.ownerUserId,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  billingResponse(company: Company): BillingResponse {
    const activeHireCount = this.getActiveHireCount(company.id);
    const activeHireLimit = this.getActiveHireLimit(company);
    return {
      plan: company.plan,
      activeHireLimit,
      activeHireCount,
      canAddActiveHire:
        activeHireLimit === null ? true : activeHireCount < activeHireLimit,
    };
  }

  memberResponse(user: User): MemberResponse {
    const company = this.requireCompany(user.companyId);
    return {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      department: user.department,
      jobTitle: user.jobTitle,
      phone: user.phone,
      isActive: user.isActive,
      isOwner: company.ownerUserId === user.id,
      invitedByUserId: user.invitedByUserId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  requireCompany(companyId: string): Company {
    const company = this.findCompanyById(companyId);
    if (!company) {
      throw new NotFoundException('Company was not found');
    }
    return company;
  }

  requireUserInCompany(companyId: string, userId: string): User {
    const user = this.findUserInCompany(companyId, userId);
    if (!user) {
      throw new NotFoundException('Member was not found in this company');
    }
    return user;
  }

  private assertSlugAvailable(slug: string, excludingCompanyId?: string): void {
    if (!this.isSlugAvailable(slug, excludingCompanyId)) {
      throw new ConflictException('Company slug is already in use');
    }
  }

  private assertDomainAvailable(domain: string, excludingCompanyId?: string): void {
    if (!this.isDomainAvailable(domain, excludingCompanyId)) {
      throw new ConflictException('Company domain is already registered');
    }
  }

  private domainVerificationStatus(
    company: Company,
  ): 'verified' | 'pending' | 'unverified' {
    if (company.pendingDomain) {
      return 'pending';
    }
    return company.domainVerifiedAt ? 'verified' : 'unverified';
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private seedDemoWorkspace(): void {
    const now = new Date().toISOString();
    const companyId = '11111111-1111-4111-8111-111111111111';
    const ownerId = '22222222-2222-4222-8222-222222222222';
    const company: Company = {
      id: companyId,
      name: 'Demo Company',
      slug: 'demo-company',
      domain: 'demo-company.com',
      domainVerifiedAt: now,
      pendingDomain: null,
      domainVerificationTokenHash: null,
      domainVerificationExpiresAt: null,
      logoUrl: null,
      brandColor: '#0F172A',
      timezone: 'Europe/Berlin',
      locale: 'de-DE',
      plan: BillingPlan.PRO,
      ownerUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    };
    const demoUsers: User[] = [
      this.demoUser(
        ownerId,
        companyId,
        'hr@demo-company.com',
        'Harriet Admin',
        Role.HR_ADMIN,
        now,
      ),
      this.demoUser(
        '33333333-3333-4333-8333-333333333333',
        companyId,
        'manager@demo-company.com',
        'Marta Manager',
        Role.MANAGER,
        now,
      ),
      this.demoUser(
        '44444444-4444-4444-8444-444444444444',
        companyId,
        'it@demo-company.com',
        'Ivan IT',
        Role.IT_ADMIN,
        now,
      ),
      this.demoUser(
        '55555555-5555-4555-8555-555555555555',
        companyId,
        'newhire@demo-company.com',
        'Nina Newhire',
        Role.NEW_HIRE,
        now,
      ),
    ];

    this.companies.set(company.id, company);
    this.activeHireCounts.set(company.id, 0);
    for (const user of demoUsers) {
      this.users.set(user.id, user);
    }
  }

  private demoUser(
    id: string,
    companyId: string,
    email: string,
    fullName: string,
    role: Role,
    now: string,
  ): User {
    return {
      id,
      companyId,
      email,
      fullName,
      role,
      passwordHash:
        'cb08672c283573aba8889a7962af15197cdaaa41aa35c367070167d5f885dce7',
      passwordSalt: 'demo-password-salt',
      passwordIterations: 1,
      avatarUrl: null,
      department: null,
      jobTitle: null,
      phone: null,
      isActive: true,
      invitedByUserId: null,
      createdAt: now,
      updatedAt: now,
    };
  }
}
