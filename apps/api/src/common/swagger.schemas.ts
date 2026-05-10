export const statusSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', example: 'ok' },
  },
};

export const successSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
  },
};

export const apiRootSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'Employee Onboarding API' },
    status: { type: 'string', example: 'ok' },
    routes: {
      type: 'object',
      properties: {
        auth: { type: 'string', example: '/api/auth' },
        company: { type: 'string', example: '/api/company' },
        docs: { type: 'string', example: '/api/docs' },
        health: { type: 'string', example: '/api/health' },
      },
    },
  },
};

export const companySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Demo Company' },
    slug: { type: 'string', example: 'demo-company' },
    domain: { type: 'string', example: 'demo-company.com' },
    domainVerifiedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
    },
    logoUrl: {
      type: 'string',
      nullable: true,
      example: 'https://cdn.example.com/logo.png',
    },
    brandColor: { type: 'string', example: '#0F172A' },
    timezone: { type: 'string', example: 'Europe/Berlin' },
    locale: { type: 'string', enum: ['de-DE', 'en-GB'] },
    plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
    activeHireLimit: { type: 'number', nullable: true, example: 5 },
    ownerUserId: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const memberSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    companyId: { type: 'string', format: 'uuid' },
    email: { type: 'string', example: 'hr@demo-company.com' },
    fullName: { type: 'string', example: 'Harriet Admin' },
    role: {
      type: 'string',
      enum: ['hr_admin', 'manager', 'it_admin', 'new_hire', 'viewer'],
    },
    avatarUrl: { type: 'string', nullable: true },
    department: { type: 'string', nullable: true },
    jobTitle: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    isActive: { type: 'boolean' },
    isOwner: { type: 'boolean' },
    invitedByUserId: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const tokenFieldsSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    tokenType: { type: 'string', example: 'Bearer' },
    expiresIn: { type: 'string', example: '15m' },
  },
};

export const authResponseSchema = {
  allOf: [
    tokenFieldsSchema,
    {
      type: 'object',
      properties: {
        user: memberSchema,
        company: companySchema,
      },
    },
  ],
};

export const currentContextSchema = {
  type: 'object',
  properties: {
    user: memberSchema,
    company: companySchema,
  },
};

export const registerBodySchema = {
  type: 'object',
  required: ['companyName', 'adminName', 'adminEmail', 'password'],
  properties: {
    companyName: { type: 'string', example: 'Acme GmbH' },
    slug: { type: 'string', example: 'acme' },
    domain: { type: 'string', example: 'acme.com' },
    adminName: { type: 'string', example: 'Olivia Owner' },
    adminEmail: { type: 'string', example: 'owner@acme.com' },
    password: { type: 'string', example: 'Demo1234!' },
    brandColor: { type: 'string', example: '#2563EB' },
    timezone: { type: 'string', example: 'Europe/Berlin' },
    locale: { type: 'string', enum: ['de-DE', 'en-GB'], example: 'en-GB' },
    plan: {
      type: 'string',
      enum: ['free', 'pro', 'enterprise'],
      example: 'free',
    },
  },
};

export const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', example: 'hr@demo-company.com' },
    password: { type: 'string', example: 'Demo1234!' },
    companySlug: { type: 'string', example: 'demo-company' },
  },
};

export const refreshBodySchema = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: { type: 'string' },
  },
};

export const logoutBodySchema = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string' },
  },
};

export const acceptInviteBodySchema = {
  type: 'object',
  required: ['token', 'password'],
  properties: {
    token: { type: 'string' },
    password: { type: 'string', example: 'Demo1234!' },
  },
};

export const updateCompanyBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'Acme GmbH' },
    slug: { type: 'string', example: 'acme' },
    domain: { type: 'string', example: 'acme.com' },
    logoUrl: { type: 'string', example: 'https://cdn.example.com/logo.png' },
    brandColor: { type: 'string', example: '#2563EB' },
    timezone: { type: 'string', example: 'Europe/Berlin' },
    locale: { type: 'string', enum: ['de-DE', 'en-GB'], example: 'en-GB' },
    plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
  },
};

export const logoBodySchema = {
  type: 'object',
  required: ['logoUrl'],
  properties: {
    logoUrl: { type: 'string', example: 'https://cdn.example.com/logo.png' },
  },
};

export const inviteMemberBodySchema = {
  type: 'object',
  required: ['email', 'fullName'],
  properties: {
    email: { type: 'string', example: 'manager@demo-company.com' },
    fullName: { type: 'string', example: 'Marta Manager' },
    role: {
      type: 'string',
      enum: ['hr_admin', 'manager', 'it_admin', 'new_hire', 'viewer'],
      example: 'manager',
    },
    allowExternalDomain: { type: 'boolean', example: false },
  },
};

export const roleBodySchema = {
  type: 'object',
  required: ['role'],
  properties: {
    role: {
      type: 'string',
      enum: ['hr_admin', 'manager', 'it_admin', 'new_hire', 'viewer'],
      example: 'viewer',
    },
  },
};

export const transferOwnershipBodySchema = {
  type: 'object',
  required: ['newOwnerUserId'],
  properties: {
    newOwnerUserId: { type: 'string', format: 'uuid' },
  },
};
