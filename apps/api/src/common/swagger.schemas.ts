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

// ── Error responses ───────────────────────────────
export const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 400 },
    message: { type: 'string', example: 'Validation failed' },
    error: { type: 'string', example: 'Bad Request' },
  },
};

export const notFoundSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 404 },
    message: { type: 'string', example: 'Resource not found' },
    error: { type: 'string', example: 'Not Found' },
  },
};

export const conflictSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 409 },
    message: { type: 'string', example: 'Resource already exists' },
    error: { type: 'string', example: 'Conflict' },
  },
};

export const tooManyRequestsSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 429 },
    message: { type: 'string', example: 'Too many requests, please slow down' },
    error: { type: 'string', example: 'Too Many Requests' },
  },
};

export const internalErrorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 500 },
    message: { type: 'string', example: 'Internal server error' },
    error: { type: 'string', example: 'Internal Server Error' },
  },
};

// ── Hires ────────────────────────────────────────
export const hireSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: 'hire-0001-0001-0001-000000000001' },
    companyId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid', nullable: true },
    managerId: { type: 'string', format: 'uuid', nullable: true },
    templateId: { type: 'string', format: 'uuid', nullable: true },
    fullName: { type: 'string', example: 'Nina Newhire' },
    email: { type: 'string', example: 'newhire@demo-company.com' },
    jobTitle: { type: 'string', nullable: true, example: 'Frontend Developer' },
    department: { type: 'string', nullable: true, example: 'Engineering' },
    startDate: { type: 'string', format: 'date', example: '2024-06-01' },
    status: {
      type: 'string',
      enum: ['pending_invite', 'in_progress', 'at_risk', 'completed', 'cancelled'],
      example: 'in_progress',
    },
    completionPct: { type: 'number', minimum: 0, maximum: 100, example: 45 },
    invitedAt: { type: 'string', format: 'date-time', nullable: true },
    startedAt: { type: 'string', format: 'date-time', nullable: true },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    cancelledAt: { type: 'string', format: 'date-time', nullable: true },
    notes: { type: 'string', nullable: true },
    createdBy: { type: 'string', format: 'uuid', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const hireWithTasksSchema = {
  allOf: [
    hireSchema,
    {
      type: 'object',
      properties: {
        tasks: { type: 'array', items: { $ref: '#/components/schemas/HireTask' } },
      },
    },
  ],
};

export const hireListSchema = {
  type: 'object',
  properties: {
    hires: { type: 'array', items: hireSchema },
    count: { type: 'number', example: 12 },
    byStatus: {
      type: 'object',
      properties: {
        pending_invite: { type: 'number', example: 3 },
        in_progress: { type: 'number', example: 6 },
        at_risk: { type: 'number', example: 1 },
        completed: { type: 'number', example: 2 },
        cancelled: { type: 'number', example: 0 },
      },
    },
  },
};

export const createHireBodySchema = {
  type: 'object',
  required: ['fullName', 'email', 'startDate'],
  properties: {
    fullName: { type: 'string', example: 'Nina Newhire' },
    email: { type: 'string', format: 'email', example: 'newhire@demo-company.com' },
    startDate: { type: 'string', format: 'date', example: '2024-06-01' },
    jobTitle: { type: 'string', example: 'Frontend Developer' },
    department: { type: 'string', example: 'Engineering' },
    managerId: { type: 'string', format: 'uuid' },
    templateId: { type: 'string', format: 'uuid' },
    notes: { type: 'string', example: 'Joining the web platform team' },
  },
};

export const updateHireBodySchema = {
  type: 'object',
  properties: {
    fullName: { type: 'string', example: 'Nina Newhire' },
    jobTitle: { type: 'string', example: 'Senior Frontend Developer' },
    department: { type: 'string', example: 'Engineering' },
    startDate: { type: 'string', format: 'date', example: '2024-06-01' },
    managerId: { type: 'string', format: 'uuid' },
    templateId: { type: 'string', format: 'uuid' },
    status: {
      type: 'string',
      enum: ['pending_invite', 'in_progress', 'at_risk', 'completed', 'cancelled'],
    },
    notes: { type: 'string' },
  },
};

export const resendInviteResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Invite resent to newhire@demo-company.com' },
  },
};

// ── Hire Tasks ───────────────────────────────────
export const hireTaskSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    hireId: { type: 'string', format: 'uuid' },
    companyId: { type: 'string', format: 'uuid' },
    templateTaskId: { type: 'string', format: 'uuid', nullable: true },
    title: { type: 'string', example: 'Setup Slack' },
    description: { type: 'string', nullable: true },
    taskType: {
      type: 'string',
      enum: ['checkbox', 'document_upload', 'form_submission', 'acknowledgement', 'meeting'],
    },
    phase: {
      type: 'string',
      enum: ['pre_boarding', 'week_1', 'month_1', 'month_3'],
    },
    assignedRole: {
      type: 'string',
      enum: ['hr_admin', 'manager', 'it_admin', 'new_hire'],
    },
    assignedTo: { type: 'string', format: 'uuid', nullable: true },
    dueDate: { type: 'string', format: 'date', nullable: true },
    status: {
      type: 'string',
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'blocked'],
    },
    isRequired: { type: 'boolean', example: true },
    sortOrder: { type: 'number', example: 0 },
    note: { type: 'string', nullable: true },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    skippedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const hireTasksListSchema = {
  type: 'object',
  properties: {
    tasks: { type: 'array', items: hireTaskSchema },
    count: { type: 'number', example: 9 },
    completionPct: { type: 'number', example: 33 },
    byPhase: {
      type: 'object',
      properties: {
        pre_boarding: { type: 'number', example: 3 },
        week_1: { type: 'number', example: 3 },
        month_1: { type: 'number', example: 2 },
        month_3: { type: 'number', example: 1 },
      },
    },
    byStatus: {
      type: 'object',
      properties: {
        pending: { type: 'number', example: 5 },
        in_progress: { type: 'number', example: 1 },
        completed: { type: 'number', example: 2 },
        skipped: { type: 'number', example: 0 },
        blocked: { type: 'number', example: 1 },
      },
    },
  },
};

export const myTasksListSchema = {
  type: 'object',
  properties: {
    tasks: { type: 'array', items: hireTaskSchema },
    count: { type: 'number', example: 4 },
  },
};

export const updateHireTaskBodySchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'blocked'],
    },
    assignedTo: { type: 'string', format: 'uuid' },
    dueDate: { type: 'string', format: 'date', example: '2024-06-05' },
    note: { type: 'string', example: 'Waiting on IT to provision access' },
  },
};

export const addNoteBodySchema = {
  type: 'object',
  required: ['note'],
  properties: {
    note: { type: 'string', example: 'Everything looks good, approved.' },
  },
};

// ── Documents ────────────────────────────────────
export const documentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    companyId: { type: 'string', format: 'uuid' },
    hireId: { type: 'string', format: 'uuid', nullable: true },
    hireTaskId: { type: 'string', format: 'uuid', nullable: true },
    uploadedBy: { type: 'string', format: 'uuid', nullable: true },
    reviewedBy: { type: 'string', format: 'uuid', nullable: true },
    name: { type: 'string', example: 'Employee Handbook 2024' },
    originalName: { type: 'string', example: 'employee_handbook_2024.pdf' },
    filePath: { type: 'string', example: 'company-id/company/employee_handbook_2024.pdf' },
    fileSize: { type: 'number', nullable: true, example: 2048000 },
    mimeType: { type: 'string', nullable: true, example: 'application/pdf' },
    checksum: { type: 'string', nullable: true, example: 'abc123def456' },
    category: {
      type: 'string',
      enum: ['policy', 'contract', 'training', 'personal_id', 'tax_form', 'certificate', 'other'],
      example: 'contract',
    },
    isCompanyDoc: { type: 'boolean', example: false },
    version: { type: 'number', example: 1 },
    parentId: { type: 'string', format: 'uuid', nullable: true },
    status: {
      type: 'string',
      enum: ['pending_review', 'approved', 'rejected', 'superseded'],
      example: 'pending_review',
    },
    reviewedAt: { type: 'string', format: 'date-time', nullable: true },
    rejectionNote: { type: 'string', nullable: true },
    retentionUntil: { type: 'string', format: 'date', nullable: true },
    gdprBasis: { type: 'string', example: 'legitimate_interest' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const documentListSchema = {
  type: 'object',
  properties: {
    documents: { type: 'array', items: documentSchema },
    count: { type: 'number', example: 4 },
    byStatus: {
      type: 'object',
      properties: {
        pending_review: { type: 'number', example: 2 },
        approved: { type: 'number', example: 1 },
        rejected: { type: 'number', example: 0 },
        superseded: { type: 'number', example: 1 },
      },
    },
    byCategory: {
      type: 'object',
      properties: {
        policy: { type: 'number', example: 1 },
        contract: { type: 'number', example: 2 },
        training: { type: 'number', example: 0 },
        personal_id: { type: 'number', example: 0 },
        tax_form: { type: 'number', example: 0 },
        certificate: { type: 'number', example: 0 },
        other: { type: 'number', example: 1 },
      },
    },
  },
};

export const documentVersionsSchema = {
  type: 'object',
  properties: {
    current: documentSchema,
    history: { type: 'array', items: documentSchema },
  },
};

export const signedUrlSchema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      example: 'https://supabase.co/storage/v1/object/sign/hire-documents/path?token=xxx&expiresIn=3600',
    },
    expiresAt: { type: 'string', format: 'date-time' },
    documentId: { type: 'string', format: 'uuid' },
  },
};

export const acknowledgementSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    documentId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    hireId: { type: 'string', format: 'uuid', nullable: true },
    hireTaskId: { type: 'string', format: 'uuid', nullable: true },
    acknowledgedAt: { type: 'string', format: 'date-time' },
    ipAddress: { type: 'string', nullable: true, example: '192.168.1.1' },
    userAgent: { type: 'string', nullable: true },
  },
};

export const acknowledgementResponseSchema = {
  type: 'object',
  properties: {
    acknowledgement: acknowledgementSchema,
    document: documentSchema,
  },
};

export const registerDocumentBodySchema = {
  type: 'object',
  required: ['name', 'originalName', 'filePath', 'category'],
  properties: {
    name: { type: 'string', example: 'Employee Handbook 2024' },
    originalName: { type: 'string', example: 'employee_handbook_2024.pdf' },
    filePath: {
      type: 'string',
      example: 'company-id/company/employee_handbook_2024.pdf',
      description: 'Supabase Storage object path returned after upload',
    },
    fileSize: { type: 'number', example: 2048000 },
    mimeType: { type: 'string', example: 'application/pdf' },
    checksum: { type: 'string', example: 'abc123def456', description: 'SHA-256 hex of file content' },
    category: {
      type: 'string',
      enum: ['policy', 'contract', 'training', 'personal_id', 'tax_form', 'certificate', 'other'],
    },
    isCompanyDoc: { type: 'boolean', example: false },
    hireId: { type: 'string', format: 'uuid' },
    hireTaskId: { type: 'string', format: 'uuid' },
  },
};

export const updateDocumentBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'Employee Handbook 2025' },
    category: {
      type: 'string',
      enum: ['policy', 'contract', 'training', 'personal_id', 'tax_form', 'certificate', 'other'],
    },
  },
};

export const rejectDocumentBodySchema = {
  type: 'object',
  required: ['reason'],
  properties: {
    reason: { type: 'string', example: 'Document is blurry and unreadable. Please re-upload.' },
  },
};

export const acknowledgeDocumentBodySchema = {
  type: 'object',
  properties: {
    hireId: { type: 'string', format: 'uuid' },
    hireTaskId: { type: 'string', format: 'uuid' },
  },
};

export const deleteDocumentResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Document "Employee Handbook 2024" deleted' },
  },
};

// ── Notifications ────────────────────────────────
export const notificationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    companyId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    type: {
      type: 'string',
      enum: [
        'hire_invited', 'hire_started', 'hire_completed', 'hire_at_risk', 'hire_cancelled',
        'task_assigned', 'task_due_soon', 'task_overdue', 'task_completed', 'task_blocked',
        'doc_uploaded', 'doc_approved', 'doc_rejected', 'approval_needed',
        'checkin_30_day', 'checkin_90_day', 'it_provisioning_needed', 'reminder_sent',
      ],
      example: 'task_assigned',
    },
    title: { type: 'string', example: 'New task assigned: Sign employment contract' },
    body: { type: 'string', nullable: true, example: 'Due: 2024-06-01' },
    link: { type: 'string', nullable: true, example: '/tasks/htask-0003?hireId=hire-0001' },
    metadata: { type: 'object', additionalProperties: true, example: { taskId: 'uuid', hireId: 'uuid' } },
    isRead: { type: 'boolean', example: false },
    readAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const notificationListSchema = {
  type: 'object',
  properties: {
    notifications: { type: 'array', items: notificationSchema },
    count: { type: 'number', example: 5 },
    unreadCount: { type: 'number', example: 3 },
  },
};

export const unreadCountSchema = {
  type: 'object',
  properties: {
    count: { type: 'number', example: 3 },
  },
};

export const markReadResponseSchema = {
  type: 'object',
  properties: {
    updated: { type: 'number', example: 4 },
  },
};

// ── Workflow Jobs ─────────────────────────────────
export const workflowJobSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    companyId: { type: 'string', format: 'uuid' },
    type: {
      type: 'string',
      enum: [
        'send_invite_email', 'send_task_reminder', 'send_overdue_escalation',
        'send_doc_review_alert', 'send_onboarding_complete', 'send_it_provisioning_alert',
        'send_manager_alert', 'send_checkin_30_day', 'send_checkin_90_day',
        'check_overdue_tasks', 'check_upcoming_tasks',
      ],
      example: 'send_task_reminder',
    },
    status: {
      type: 'string',
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      example: 'pending',
    },
    payload: { type: 'object', additionalProperties: true },
    scheduledAt: { type: 'string', format: 'date-time' },
    startedAt: { type: 'string', format: 'date-time', nullable: true },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    failedAt: { type: 'string', format: 'date-time', nullable: true },
    attempts: { type: 'number', example: 0 },
    maxAttempts: { type: 'number', example: 3 },
    lastError: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const workflowJobListSchema = {
  type: 'object',
  properties: {
    jobs: { type: 'array', items: workflowJobSchema },
    count: { type: 'number', example: 10 },
    byStatus: {
      type: 'object',
      properties: {
        pending: { type: 'number', example: 3 },
        running: { type: 'number', example: 0 },
        completed: { type: 'number', example: 6 },
        failed: { type: 'number', example: 1 },
        cancelled: { type: 'number', example: 0 },
      },
    },
  },
};

export const scheduleJobBodySchema = {
  type: 'object',
  required: ['type', 'payload', 'scheduledAt'],
  properties: {
    type: {
      type: 'string',
      enum: [
        'send_invite_email', 'send_task_reminder', 'send_overdue_escalation',
        'send_doc_review_alert', 'send_onboarding_complete', 'send_it_provisioning_alert',
        'send_manager_alert', 'send_checkin_30_day', 'send_checkin_90_day',
        'check_overdue_tasks', 'check_upcoming_tasks',
      ],
    },
    payload: { type: 'object', additionalProperties: true, example: { hireId: 'uuid', taskTitle: 'Sign NDA' } },
    scheduledAt: { type: 'string', format: 'date-time', example: '2024-06-02T09:00:00Z' },
  },
};

// ── Email Log ─────────────────────────────────────
export const emailLogSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    companyId: { type: 'string', format: 'uuid' },
    recipient: { type: 'string', example: 'newhire@demo-company.com' },
    subject: { type: 'string', example: 'Welcome to Demo Company — Your onboarding starts here' },
    template: { type: 'string', example: 'hire_invite' },
    status: { type: 'string', enum: ['queued', 'sent', 'failed', 'bounced'], example: 'sent' },
    providerId: { type: 'string', nullable: true, example: 'sim_abc123def456' },
    error: { type: 'string', nullable: true },
    sentAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const emailLogListSchema = {
  type: 'object',
  properties: {
    emails: { type: 'array', items: emailLogSchema },
    count: { type: 'number', example: 12 },
    byStatus: {
      type: 'object',
      properties: {
        queued: { type: 'number', example: 0 },
        sent: { type: 'number', example: 11 },
        failed: { type: 'number', example: 1 },
        bounced: { type: 'number', example: 0 },
      },
    },
  },
};

export const triggerWorkflowBodySchema = {
  type: 'object',
  required: ['event'],
  properties: {
    event: {
      type: 'string',
      enum: ['hire_created', 'hire_completed', 'hire_at_risk', 'task_assigned', 'task_completed', 'task_blocked', 'doc_uploaded', 'doc_approved', 'doc_rejected'],
      example: 'hire_created',
    },
    payload: { type: 'object', additionalProperties: true },
  },
};

export const schedulerStatusSchema = {
  type: 'object',
  properties: {
    running: { type: 'boolean', example: true },
    tickIntervalMs: { type: 'number', example: 60000 },
    lastTickAt: { type: 'string', format: 'date-time', nullable: true },
    pendingJobs: { type: 'number', example: 2 },
  },
};

// ── IT Checklists ─────────────────────────────────
export const itItemCategoryEnum = ['hardware', 'software', 'access', 'communication', 'security', 'other'];
export const itItemStatusEnum = ['pending', 'in_progress', 'completed', 'skipped', 'blocked'];
export const itChecklistStatusEnum = ['pending', 'in_progress', 'completed', 'blocked'];

export const itChecklistTemplateItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    templateId: { type: 'string', format: 'uuid' },
    companyId: { type: 'string', format: 'uuid' },
    title: { type: 'string', example: 'Provision laptop' },
    description: { type: 'string', nullable: true, example: 'Order and configure MacBook Pro 14"' },
    category: { type: 'string', enum: itItemCategoryEnum, example: 'hardware' },
    sortOrder: { type: 'number', example: 0 },
    isRequired: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const itChecklistTemplateSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    companyId: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Standard IT Onboarding' },
    description: { type: 'string', nullable: true },
    isDefault: { type: 'boolean', example: true },
    createdBy: { type: 'string', format: 'uuid', nullable: true },
    items: { type: 'array', items: itChecklistTemplateItemSchema },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const itChecklistItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    checklistId: { type: 'string', format: 'uuid' },
    companyId: { type: 'string', format: 'uuid' },
    templateItemId: { type: 'string', format: 'uuid', nullable: true },
    title: { type: 'string', example: 'Provision laptop' },
    description: { type: 'string', nullable: true },
    category: { type: 'string', enum: itItemCategoryEnum, example: 'hardware' },
    sortOrder: { type: 'number', example: 0 },
    isRequired: { type: 'boolean', example: true },
    status: { type: 'string', enum: itItemStatusEnum, example: 'pending' },
    note: { type: 'string', nullable: true, example: 'Waiting for stock' },
    assetTag: { type: 'string', nullable: true, example: 'ASSET-0042' },
    serialNumber: { type: 'string', nullable: true, example: 'C02XK1JFHV2Q' },
    completedBy: { type: 'string', format: 'uuid', nullable: true },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const itChecklistSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    companyId: { type: 'string', format: 'uuid' },
    hireId: { type: 'string', format: 'uuid' },
    templateId: { type: 'string', format: 'uuid', nullable: true },
    assignedTo: { type: 'string', format: 'uuid', nullable: true },
    status: { type: 'string', enum: itChecklistStatusEnum, example: 'in_progress' },
    completionPct: { type: 'number', minimum: 0, maximum: 100, example: 33 },
    dueDate: { type: 'string', format: 'date', nullable: true },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    notes: { type: 'string', nullable: true },
    items: { type: 'array', items: itChecklistItemSchema },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const itChecklistListSchema = {
  type: 'object',
  properties: {
    checklists: { type: 'array', items: itChecklistSchema },
    count: { type: 'number', example: 3 },
    byStatus: {
      type: 'object',
      properties: {
        pending: { type: 'number', example: 1 },
        in_progress: { type: 'number', example: 1 },
        completed: { type: 'number', example: 1 },
        blocked: { type: 'number', example: 0 },
      },
    },
  },
};

export const createItTemplateBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', example: 'Standard IT Onboarding' },
    description: { type: 'string', example: 'Default checklist for all new hires' },
    isDefault: { type: 'boolean', example: false },
  },
};

export const updateItTemplateBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'Standard IT Onboarding v2' },
    description: { type: 'string' },
    isDefault: { type: 'boolean' },
  },
};

export const createItTemplateItemBodySchema = {
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string', example: 'Provision laptop' },
    description: { type: 'string', example: 'Order and configure MacBook Pro 14"' },
    category: { type: 'string', enum: itItemCategoryEnum, example: 'hardware' },
    isRequired: { type: 'boolean', example: true },
  },
};

export const updateItTemplateItemBodySchema = {
  type: 'object',
  properties: {
    title: { type: 'string', example: 'Provision laptop' },
    description: { type: 'string' },
    category: { type: 'string', enum: itItemCategoryEnum },
    isRequired: { type: 'boolean' },
  },
};

export const reorderItItemsBodySchema = {
  type: 'object',
  required: ['itemIds'],
  properties: {
    itemIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
  },
};

export const createItChecklistBodySchema = {
  type: 'object',
  required: ['hireId'],
  properties: {
    hireId: { type: 'string', format: 'uuid' },
    templateId: { type: 'string', format: 'uuid' },
    assignedTo: { type: 'string', format: 'uuid' },
    dueDate: { type: 'string', format: 'date', example: '2024-06-01' },
    notes: { type: 'string', example: 'Priority hire — start date is firm' },
  },
};

export const updateItChecklistBodySchema = {
  type: 'object',
  properties: {
    assignedTo: { type: 'string', format: 'uuid' },
    dueDate: { type: 'string', format: 'date' },
    notes: { type: 'string' },
    status: { type: 'string', enum: itChecklistStatusEnum },
  },
};

export const updateItChecklistItemBodySchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: itItemStatusEnum },
    note: { type: 'string', example: 'Waiting for stock from supplier' },
    assetTag: { type: 'string', example: 'ASSET-0042' },
    serialNumber: { type: 'string', example: 'C02XK1JFHV2Q' },
  },
};

export const completeItItemBodySchema = {
  type: 'object',
  properties: {
    note: { type: 'string', example: 'Configured and handed over to hire' },
    assetTag: { type: 'string', example: 'ASSET-0042' },
    serialNumber: { type: 'string', example: 'C02XK1JFHV2Q' },
  },
};

export const blockItItemBodySchema = {
  type: 'object',
  properties: {
    note: { type: 'string', example: 'Waiting for desk allocation from facilities' },
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
