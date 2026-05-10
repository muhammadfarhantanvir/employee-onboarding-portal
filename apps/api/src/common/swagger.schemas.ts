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
    pendingDomain: {
      type: 'string',
      nullable: true,
      example: 'acme.com',
    },
    domainVerificationStatus: {
      type: 'string',
      enum: ['verified', 'pending', 'unverified'],
      example: 'verified',
    },
    domainVerificationExpiresAt: {
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
    activeHireCount: { type: 'number', example: 0 },
    ownerUserId: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const workspaceAvailabilitySchema = {
  type: 'object',
  properties: {
    slug: {
      type: 'object',
      properties: {
        value: { type: 'string', example: 'acme' },
        available: { type: 'boolean', example: true },
      },
    },
    domain: {
      type: 'object',
      properties: {
        value: { type: 'string', example: 'acme.com' },
        available: { type: 'boolean', example: true },
      },
    },
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

export const domainVerificationBodySchema = {
  type: 'object',
  properties: {
    domain: { type: 'string', example: 'acme.com' },
  },
};

export const domainVerificationChallengeSchema = {
  type: 'object',
  properties: {
    domain: { type: 'string', example: 'acme.com' },
    verificationToken: { type: 'string' },
    txtRecordName: {
      type: 'string',
      example: '_onboarding-portal.acme.com',
    },
    txtRecordValue: {
      type: 'string',
      example: 'onboarding-portal-verify=abc123',
    },
    expiresAt: { type: 'string', format: 'date-time' },
  },
};

export const verifyDomainBodySchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: { type: 'string' },
  },
};

export const billingSchema = {
  type: 'object',
  properties: {
    plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
    activeHireLimit: { type: 'number', nullable: true, example: 5 },
    activeHireCount: { type: 'number', example: 0 },
    canAddActiveHire: { type: 'boolean', example: true },
  },
};

export const updateBillingBodySchema = {
  type: 'object',
  required: ['plan'],
  properties: {
    plan: {
      type: 'string',
      enum: ['free', 'pro', 'enterprise'],
      example: 'pro',
    },
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

// ── Onboarding Templates ─────────────────────────
export const templateTaskSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string', example: 'Setup Workstation' },
    description: { type: 'string', example: 'Detailed instructions for IT' },
    taskType: { type: 'string', enum: ['checkbox', 'document_upload', 'acknowledgement', 'form', 'meeting'] },
    phase: { type: 'string', enum: ['pre_boarding', 'week_1', 'month_1', 'month_3'] },
    assignedRole: { type: 'string', enum: ['hr_admin', 'manager', 'it_admin', 'new_hire'] },
    dueDayOffset: { type: 'number', example: 0 },
    sortOrder: { type: 'number', example: 0 },
    isRequired: { type: 'boolean', example: true },
  },
};

export const onboardingTemplateSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Software Engineer' },
    description: { type: 'string', example: 'Standard onboarding for devs' },
    department: { type: 'string', example: 'Engineering' },
    isDefault: { type: 'boolean', example: false },
    tasks: { type: 'array', items: templateTaskSchema },
  },
};

export const createTemplateBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', example: 'Software Engineer' },
    description: { type: 'string', example: 'Standard onboarding for devs' },
    department: { type: 'string', example: 'Engineering' },
  },
};

export const updateTemplateBodySchema = createTemplateBodySchema;

export const createTemplateTaskBodySchema = {
  type: 'object',
  required: ['title', 'taskType', 'phase'],
  properties: {
    title: { type: 'string', example: 'Setup Workstation' },
    description: { type: 'string', example: 'Detailed instructions for IT' },
    taskType: { type: 'string', enum: ['checkbox', 'document_upload', 'acknowledgement', 'form', 'meeting'] },
    phase: { type: 'string', enum: ['pre_boarding', 'week_1', 'month_1', 'month_3'] },
    assignedRole: { type: 'string', enum: ['hr_admin', 'manager', 'it_admin', 'new_hire'] },
    dueDayOffset: { type: 'number', example: 0 },
  },
};

export const updateTemplateTaskBodySchema = {
  type: 'object',
  properties: {
    title: { type: 'string', example: 'Setup Workstation' },
    description: { type: 'string', example: 'Detailed instructions for IT' },
    taskType: { type: 'string', enum: ['checkbox', 'document_upload', 'acknowledgement', 'form_submission', 'meeting'] },
    phase: { type: 'string', enum: ['pre_boarding', 'week_1', 'month_1', 'month_3'] },
    assignedRole: { type: 'string', enum: ['hr_admin', 'manager', 'it_admin', 'new_hire'] },
    dueDayOffset: { type: 'number', example: 0 },
    isRequired: { type: 'boolean', example: true },
  },
};

export const duplicateTemplateBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'Software Engineer — Backend' },
    department: { type: 'string', example: 'Engineering' },
  },
};

export const reorderTasksBodySchema = {
  type: 'object',
  required: ['taskIds'],
  properties: {
    taskIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
  },
};

// ── Hires ────────────────────────────────────────
export const hireSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    fullName: { type: 'string', example: 'Nina Newhire' },
    email: { type: 'string', example: 'newhire@demo-company.com' },
    jobTitle: { type: 'string', example: 'Frontend Dev' },
    department: { type: 'string', example: 'Engineering' },
    startDate: { type: 'string', format: 'date', example: '2024-06-01' },
    status: { type: 'string', enum: ['pending_invite', 'in_progress', 'at_risk', 'completed', 'cancelled'] },
    completionPct: { type: 'number', example: 45 },
    managerId: { type: 'string', format: 'uuid', nullable: true },
    templateId: { type: 'string', format: 'uuid', nullable: true },
  },
};

export const createHireBodySchema = {
  type: 'object',
  required: ['fullName', 'email', 'startDate'],
  properties: {
    fullName: { type: 'string', example: 'Nina Newhire' },
    email: { type: 'string', example: 'newhire@demo-company.com' },
    startDate: { type: 'string', format: 'date', example: '2024-06-01' },
    jobTitle: { type: 'string', example: 'Frontend Dev' },
    department: { type: 'string', example: 'Engineering' },
    managerId: { type: 'string', format: 'uuid' },
    templateId: { type: 'string', format: 'uuid' },
  },
};

// ── Hire Tasks ───────────────────────────────────
export const hireTaskSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string', example: 'Setup Slack' },
    status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'skipped', 'blocked'] },
    dueDate: { type: 'string', format: 'date' },
    assignedTo: { type: 'string', format: 'uuid' },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

// ── Documents ────────────────────────────────────
export const documentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Employment_Contract.pdf' },
    category: { type: 'string', enum: ['policy', 'contract', 'training', 'personal_id', 'tax_form', 'other'] },
    status: { type: 'string', enum: ['pending_review', 'approved', 'rejected', 'superseded'] },
    fileSize: { type: 'number', example: 1024567 },
    mimeType: { type: 'string', example: 'application/pdf' },
    uploadedAt: { type: 'string', format: 'date-time' },
  },
};

// ── Analytics ────────────────────────────────────
export const analyticsOverviewSchema = {
  type: 'object',
  properties: {
    activeHires: { type: 'number', example: 12 },
    completionRate: { type: 'number', example: 84 },
    atRiskHires: { type: 'number', example: 2 },
    pendingDocuments: { type: 'number', example: 5 },
  },
};

// ── Notifications ────────────────────────────────
export const notificationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    type: { type: 'string', example: 'task_assigned' },
    title: { type: 'string', example: 'New task assigned' },
    body: { type: 'string', example: 'Please sign the NDA' },
    isRead: { type: 'boolean', example: false },
    createdAt: { type: 'string', format: 'date-time' },
  },
};
