import { Role } from '../../workspace/workspace.types';

/**
 * Permission matrix for the Employee Onboarding Portal
 * Defines granular access control across different resources and actions
 */
export enum Permission {
  // Onboarding Plans
  CREATE_ONBOARDING_PLANS = 'create_onboarding_plans',
  READ_ONBOARDING_PLANS = 'read_onboarding_plans',
  UPDATE_ONBOARDING_PLANS = 'update_onboarding_plans',
  DELETE_ONBOARDING_PLANS = 'delete_onboarding_plans',

  // New Hires
  INVITE_NEW_HIRES = 'invite_new_hires',
  VIEW_ALL_HIRES = 'view_all_hires',
  VIEW_OWN_HIRE = 'view_own_hire',
  UPDATE_HIRE_METADATA = 'update_hire_metadata',
  DELETE_HIRE = 'delete_hire',

  // Tasks
  COMPLETE_OWN_TASKS = 'complete_own_tasks',
  COMPLETE_ANY_TASKS = 'complete_any_tasks',
  VIEW_ALL_TASKS = 'view_all_tasks',
  VIEW_OWN_TASKS = 'view_own_tasks',
  ASSIGN_TASKS = 'assign_tasks',

  // Documents
  MANAGE_DOCUMENTS = 'manage_documents',
  UPLOAD_OWN_DOCUMENTS = 'upload_own_documents',
  REVIEW_DOCUMENTS = 'review_documents',
  VIEW_ALL_DOCUMENTS = 'view_all_documents',
  VIEW_OWN_DOCUMENTS = 'view_own_documents',

  // Analytics
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_ANALYTICS = 'export_analytics',

  // Approvals
  APPROVE_ONBOARDING = 'approve_onboarding',

  // Company Management
  MANAGE_COMPANY_SETTINGS = 'manage_company_settings',
  MANAGE_TEAM_MEMBERS = 'manage_team_members',

  // GDPR
  MANAGE_GDPR = 'manage_gdpr',
  VIEW_DATA_ACCESS_LOG = 'view_data_access_log',
  REQUEST_DATA_ERASURE = 'request_data_erasure',
}

/**
 * Role-to-permissions mapping
 * Defines what each role can do in the system
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.HR_ADMIN]: [
    // Plans
    Permission.CREATE_ONBOARDING_PLANS,
    Permission.READ_ONBOARDING_PLANS,
    Permission.UPDATE_ONBOARDING_PLANS,
    Permission.DELETE_ONBOARDING_PLANS,

    // Hires
    Permission.INVITE_NEW_HIRES,
    Permission.VIEW_ALL_HIRES,
    Permission.UPDATE_HIRE_METADATA,
    Permission.DELETE_HIRE,

    // Tasks
    Permission.VIEW_ALL_TASKS,
    Permission.ASSIGN_TASKS,
    Permission.COMPLETE_ANY_TASKS,

    // Documents
    Permission.MANAGE_DOCUMENTS,
    Permission.REVIEW_DOCUMENTS,
    Permission.VIEW_ALL_DOCUMENTS,

    // Analytics
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_ANALYTICS,

    // Company
    Permission.MANAGE_COMPANY_SETTINGS,
    Permission.MANAGE_TEAM_MEMBERS,

    // GDPR
    Permission.MANAGE_GDPR,
    Permission.VIEW_DATA_ACCESS_LOG,
  ],

  [Role.MANAGER]: [
    // Plans (read-only)
    Permission.READ_ONBOARDING_PLANS,

    // Hires
    Permission.VIEW_ALL_HIRES,

    // Tasks
    Permission.VIEW_ALL_TASKS,
    Permission.COMPLETE_ANY_TASKS,

    // Documents
    Permission.VIEW_ALL_DOCUMENTS,

    // Analytics
    Permission.VIEW_ANALYTICS,

    // Approvals
    Permission.APPROVE_ONBOARDING,
  ],

  [Role.IT_ADMIN]: [
    // Tasks
    Permission.COMPLETE_OWN_TASKS,
    Permission.VIEW_OWN_TASKS,

    // Documents
    Permission.VIEW_ALL_DOCUMENTS,
  ],

  [Role.NEW_HIRE]: [
    // Tasks
    Permission.COMPLETE_OWN_TASKS,
    Permission.VIEW_OWN_TASKS,

    // Documents
    Permission.UPLOAD_OWN_DOCUMENTS,
    Permission.VIEW_OWN_DOCUMENTS,

    // Hires
    Permission.VIEW_OWN_HIRE,

    // GDPR — new hire can request their own data erasure
    Permission.REQUEST_DATA_ERASURE,
  ],

  [Role.VIEWER]: [
    // Hires (read-only)
    Permission.VIEW_ALL_HIRES,

    // Analytics (read-only)
    Permission.VIEW_ANALYTICS,

    // Documents (read-only)
    Permission.VIEW_ALL_DOCUMENTS,
  ],
};

/**
 * Helper to check if a role has a specific permission
 */
export const hasPermission = (role: Role, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

/**
 * Helper to get all permissions for a role
 */
export const getRolePermissions = (role: Role): Permission[] => {
  return ROLE_PERMISSIONS[role] ?? [];
};

/**
 * Get all roles that have a specific permission
 */
export const getRolesWithPermission = (permission: Permission): Role[] => {
  return Object.entries(ROLE_PERMISSIONS)
    .filter(([, permissions]) => permissions.includes(permission))
    .map(([role]) => role as Role);
};
