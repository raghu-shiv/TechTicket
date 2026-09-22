import { SetMetadata } from '@nestjs/common';

import type { OrganizationRole } from './organization.types';

export const ORGANIZATION_ROLES_KEY = 'organization_roles';

export const OrganizationRoles = (...roles: OrganizationRole[]) =>
  SetMetadata(ORGANIZATION_ROLES_KEY, roles);
