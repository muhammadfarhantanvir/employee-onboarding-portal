import { BadRequestException } from '@nestjs/common';
import {
  BILLING_PLANS,
  BillingPlan,
  ROLES,
  Role,
  SUPPORTED_LOCALES,
  SupportedLocale,
} from '../../workspace/workspace.types';

interface StringOptions {
  min?: number;
  max?: number;
}

export function requireBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Request body must be a JSON object');
  }
  return value as Record<string, unknown>;
}

export function readRequiredString(
  body: Record<string, unknown>,
  key: string,
  options: StringOptions = {},
): string {
  const value = readOptionalString(body, key, options);
  if (!value) {
    throw new BadRequestException(`${key} is required`);
  }
  return value;
}

export function readOptionalString(
  body: Record<string, unknown>,
  key: string,
  options: StringOptions = {},
): string | undefined {
  const value = body[key];
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(`${key} must be a string`);
  }

  const trimmed = value.trim();
  if (options.min !== undefined && trimmed.length < options.min) {
    throw new BadRequestException(`${key} must be at least ${options.min} characters`);
  }
  if (options.max !== undefined && trimmed.length > options.max) {
    throw new BadRequestException(`${key} must be at most ${options.max} characters`);
  }

  return trimmed;
}

export function readBoolean(
  body: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = body[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${key} must be a boolean`);
  }
  return value;
}

export function normalizeEmail(value: string, key = 'email'): string {
  const email = value.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    throw new BadRequestException(`${key} must be a valid email address`);
  }
  return email;
}

export function emailDomain(email: string): string {
  return email.split('@')[1].toLowerCase();
}

export function slugFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);

  return slug || 'company';
}

export function normalizeSlug(value: string, key = 'slug'): string {
  const slug = value.trim().toLowerCase();
  const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  if (!slugPattern.test(slug)) {
    throw new BadRequestException(
      `${key} must use lowercase letters, numbers, and hyphens`,
    );
  }
  return slug;
}

export function normalizeDomain(value: string, key = 'domain'): string {
  const domain = value.trim().toLowerCase().replace(/^@/, '');
  const domainPattern =
    /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;
  if (!domainPattern.test(domain)) {
    throw new BadRequestException(`${key} must be a valid domain`);
  }
  return domain;
}

export function normalizeBrandColor(value: string): string {
  const color = value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new BadRequestException('brandColor must be a hex color like #0F172A');
  }
  return color.toUpperCase();
}

export function normalizeTimezone(value: string): string {
  const timezone = value.trim();
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch {
    throw new BadRequestException('timezone must be a valid IANA timezone');
  }
  return timezone;
}

export function normalizeUrl(value: string, key: string): string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('unsupported protocol');
    }
    return url.toString();
  } catch {
    throw new BadRequestException(`${key} must be a valid http(s) URL`);
  }
}

export function readRole(
  body: Record<string, unknown>,
  key: string,
  defaultValue?: Role,
): Role {
  const value = readOptionalString(body, key);
  if (!value) {
    if (defaultValue) {
      return defaultValue;
    }
    throw new BadRequestException(`${key} is required`);
  }
  if (!ROLES.includes(value as Role)) {
    throw new BadRequestException(`${key} must be one of: ${ROLES.join(', ')}`);
  }
  return value as Role;
}

export function readBillingPlan(
  body: Record<string, unknown>,
  key: string,
  defaultValue: BillingPlan,
): BillingPlan;
export function readBillingPlan(
  body: Record<string, unknown>,
  key: string,
): BillingPlan | undefined;
export function readBillingPlan(
  body: Record<string, unknown>,
  key: string,
  defaultValue?: BillingPlan,
): BillingPlan | undefined {
  const value = readOptionalString(body, key);
  if (!value) {
    return defaultValue;
  }
  if (!BILLING_PLANS.includes(value as BillingPlan)) {
    throw new BadRequestException(
      `${key} must be one of: ${BILLING_PLANS.join(', ')}`,
    );
  }
  return value as BillingPlan;
}

export function readLocale(
  body: Record<string, unknown>,
  key: string,
  defaultValue: SupportedLocale,
): SupportedLocale;
export function readLocale(
  body: Record<string, unknown>,
  key: string,
): SupportedLocale | undefined;
export function readLocale(
  body: Record<string, unknown>,
  key: string,
  defaultValue?: SupportedLocale,
): SupportedLocale | undefined {
  const value = readOptionalString(body, key);
  if (!value) {
    return defaultValue;
  }
  if (!SUPPORTED_LOCALES.includes(value as SupportedLocale)) {
    throw new BadRequestException(
      `${key} must be one of: ${SUPPORTED_LOCALES.join(', ')}`,
    );
  }
  return value as SupportedLocale;
}
