export const Role = {
  HR_ADMIN: 'hr_admin',
  MANAGER: 'manager',
  IT_ADMIN: 'it_admin',
  NEW_HIRE: 'new_hire',
  VIEWER: 'viewer',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES: readonly Role[] = Object.values(Role);

export const BillingPlan = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export type BillingPlan = (typeof BillingPlan)[keyof typeof BillingPlan];

export const BILLING_PLANS: readonly BillingPlan[] = Object.values(BillingPlan);

export const SUPPORTED_LOCALES = ['de-DE', 'en-GB'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain: string;
  domainVerifiedAt: string | null;
  pendingDomain: string | null;
  domainVerificationTokenHash: string | null;
  domainVerificationExpiresAt: string | null;
  logoUrl: string | null;
  brandColor: string;
  timezone: string;
  locale: SupportedLocale;
  plan: BillingPlan;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: Role;
  passwordHash: string | null;
  passwordSalt: string | null;
  passwordIterations: number;
  avatarUrl: string | null;
  department: string | null;
  jobTitle: string | null;
  phone: string | null;
  isActive: boolean;
  invitedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  token: string;
  companyId: string;
  userId: string;
  email: string;
  role: Role;
  invitedByUserId: string;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface RefreshSession {
  id: string;
  userId: string;
  companyId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

export interface AuthenticatedUser {
  id: string;
  companyId: string;
  companySlug: string;
  email: string;
  fullName: string;
  role: Role;
  isOwner: boolean;
}

export interface TenantContext {
  companyId: string;
  slug: string;
  source: 'header' | 'host' | 'query';
}

export interface CompanyResponse {
  id: string;
  name: string;
  slug: string;
  domain: string;
  domainVerifiedAt: string | null;
  pendingDomain: string | null;
  domainVerificationStatus: 'verified' | 'pending' | 'unverified';
  domainVerificationExpiresAt: string | null;
  logoUrl: string | null;
  brandColor: string;
  timezone: string;
  locale: SupportedLocale;
  plan: BillingPlan;
  activeHireLimit: number | null;
  activeHireCount: number;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberResponse {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl: string | null;
  department: string | null;
  jobTitle: string | null;
  phone: string | null;
  isActive: boolean;
  isOwner: boolean;
  invitedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceAvailabilityResponse {
  slug?: {
    value: string;
    available: boolean;
  };
  domain?: {
    value: string;
    available: boolean;
  };
}

export interface DomainVerificationChallengeResponse {
  domain: string;
  verificationToken: string;
  txtRecordName: string;
  txtRecordValue: string;
  expiresAt: string;
}

export interface BillingResponse {
  plan: BillingPlan;
  activeHireLimit: number | null;
  activeHireCount: number;
  canAddActiveHire: boolean;
}
