/**
 * RBAC Implementation Examples
 * ═══════════════════════════════════════════════════════════════
 *
 * This file demonstrates how to use the RBAC system in controllers
 * and services throughout the application.
 */

// ═══════════════════════════════════════════════════════════════
// Example 1: Using @RequirePermissions (AND logic)
// ═══════════════════════════════════════════════════════════════
/*
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import {
  RequirePermissions,
  Permission,
} from '../common/rbac';

@Controller('hires')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HiresController {
  // Only HR Admin and Manager can view all hires
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get()
  async findAll() {
    // Implementation
  }

  // Only HR Admin can create and manage invites
  @RequirePermissions(Permission.INVITE_NEW_HIRES)
  @Post()
  async create() {
    // Implementation
  }
}
*/

// ═══════════════════════════════════════════════════════════════
// Example 2: Using @RequireAnyPermission (OR logic)
// ═══════════════════════════════════════════════════════════════
/*
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/rbac/permissions.guard';
import {
  RequireAnyPermission,
  Permission,
} from '../common/rbac';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  // Both HR Admin and New Hire can upload documents
  @RequireAnyPermission(
    Permission.MANAGE_DOCUMENTS,
    Permission.UPLOAD_OWN_DOCUMENTS
  )
  @Post()
  async upload() {
    // Implementation
  }
}
*/

// ═══════════════════════════════════════════════════════════════
// Example 3: Role-based Guards (old way, still works)
// ═══════════════════════════════════════════════════════════════
/*
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../workspace/workspace.types';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  // Only HR Admin and Manager
  @Roles(Role.HR_ADMIN, Role.MANAGER)
  @Get('overview')
  async getOverview() {
    // Implementation
  }

  // Only HR Admin
  @Roles(Role.HR_ADMIN)
  @Get('detailed')
  async getDetailed() {
    // Implementation
  }
}
*/

// ═══════════════════════════════════════════════════════════════
// Example 4: Permission checking in services
// ═══════════════════════════════════════════════════════════════
/*
import { Injectable, ForbiddenException } from '@nestjs/common';
import { hasPermission, Permission } from '../common/rbac';
import { AuthenticatedUser, Role } from '../workspace/workspace.types';

@Injectable()
export class HiresService {
  async createHire(user: AuthenticatedUser, hireData: unknown) {
    // Check permission in service layer
    if (!hasPermission(user.role, Permission.INVITE_NEW_HIRES)) {
      throw new ForbiddenException(
        'You do not have permission to invite new hires'
      );
    }

    // Proceed with business logic
    // ...
  }
}
*/

// ═══════════════════════════════════════════════════════════════
// Example 5: Database isolation with RLS
// ═══════════════════════════════════════════════════════════════
/*
When using Supabase RLS policies (defined in 0002_rbac_policies.sql):

1. HR Admin cannot access another company's data (enforced by RLS)
2. New Hires can only see their own hire record (enforced by RLS)
3. Managers can only see and update hires in their company (enforced by RLS)

The database acts as a second line of defense:
- Even if API is compromised, RLS prevents cross-tenant data access
- Every query is filtered by company_id and user role
- Storage buckets are partitioned by company_id

Example query with RLS:
  SELECT * FROM hires WHERE company_id = $1

  With RLS enabled, this becomes:
  SELECT * FROM hires 
  WHERE company_id = $1 
    AND (
      -- HR Admin check
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'hr_admin'
      )
      OR
      -- Manager check (own hires)
      manager_id = auth.uid()
      OR
      -- New Hire check (own hire)
      user_id = auth.uid()
    )
*/

// ═══════════════════════════════════════════════════════════════
// Example 6: Audit logging with permissions
// ═══════════════════════════════════════════════════════════════
/*
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { AuditLogInterceptor } from '../common/interceptors/audit-log.interceptor';

@Controller('hires')
@UseInterceptors(AuditLogInterceptor)
export class HiresController {
  @Get()
  async findAll() {
    // Every action is logged with:
    // - user ID and role
    // - company ID
    // - action type
    // - timestamp
    // - IP address
  }
}
*/

// ═══════════════════════════════════════════════════════════════
// IMPLEMENTATION CHECKLIST
// ═══════════════════════════════════════════════════════════════

/*
✅ DONE:
1. Role constants defined in workspace.types.ts
2. Permission enum and role-permission matrix in rbac.constants.ts
3. @RequirePermissions and @RequireAnyPermission decorators
4. PermissionsGuard for API-level enforcement
5. RLS policies in Supabase for database-level enforcement
6. PermissionsGuard registered globally in app.module.ts

🔧 TO IMPLEMENT IN CONTROLLERS:

1. Create company-related controllers:
   - CreateCompanyController: @RequirePermissions(MANAGE_COMPANY_SETTINGS)
   - ManageTeamController: @RequirePermissions(MANAGE_TEAM_MEMBERS)

2. Update hire controllers:
   - @RequirePermissions(VIEW_ALL_HIRES) on getAll()
   - @RequirePermissions(INVITE_NEW_HIRES) on create()
   - @RequirePermissions(APPROVE_ONBOARDING) on approveOnboarding()

3. Update template controllers:
   - @RequirePermissions(CREATE_ONBOARDING_PLANS) on create()
   - @RequirePermissions(READ_ONBOARDING_PLANS) on getAll()

4. Update task controllers:
   - @RequirePermissions(COMPLETE_OWN_TASKS) on completeTask()
   - @RequirePermissions(VIEW_ALL_TASKS) on getAll()

5. Update document controllers:
   - @RequirePermissions(MANAGE_DOCUMENTS) on uploadCompanyDoc()
   - @RequirePermissions(UPLOAD_OWN_DOCUMENTS) on uploadHireDoc()
   - @RequirePermissions(REVIEW_DOCUMENTS) on approveDocument()

6. Update analytics controllers:
   - @RequirePermissions(VIEW_ANALYTICS) on getAnalytics()
   - @RequirePermissions(EXPORT_ANALYTICS) on exportData()

7. Create audit log interceptor to track all permission checks

8. Add permission validation in services for business logic checks

9. Update API documentation with permission requirements in Swagger
*/

// ═══════════════════════════════════════════════════════════════
// USAGE PATTERNS
// ═══════════════════════════════════════════════════════════════

/*
Pattern 1: Simple permission check
────────────────────────────────
@Controller('hires')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HiresController {
  @RequirePermissions(Permission.VIEW_ALL_HIRES)
  @Get()
  findAll() { }
}

Pattern 2: Multiple required permissions (AND logic)
────────────────────────────────────────────────────
@RequirePermissions(
  Permission.VIEW_ALL_HIRES,
  Permission.APPROVE_ONBOARDING
)
@Patch(':id/approve')
approveHire() { }

Pattern 3: Alternative permissions (OR logic)
──────────────────────────────────────────────
@RequireAnyPermission(
  Permission.MANAGE_DOCUMENTS,
  Permission.UPLOAD_OWN_DOCUMENTS
)
@Post('upload')
uploadDocument() { }

Pattern 4: No permission decorator = Public route
──────────────────────────────────────────────────
// Will not be checked by PermissionsGuard
@Post('login')
@Public()  // Add @Public() decorator for public routes
login() { }

Pattern 5: Service-level permission checks
───────────────────────────────────────────
if (!hasPermission(user.role, Permission.INVITE_NEW_HIRES)) {
  throw new ForbiddenException('Insufficient permissions');
}
*/

export {};
