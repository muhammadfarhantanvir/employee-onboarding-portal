import { Request } from 'express';
import {
  AuthenticatedUser,
  TenantContext,
} from '../workspace/workspace.types';

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
  tenant?: TenantContext;
  requestedTenantSlug?: string;
  companyId?: string;
}
