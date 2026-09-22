import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import type { Request } from 'express';

import type { OrganizationContext } from '../organization/organization.types';
import { PERMISSIONS_KEY } from './permission.decorator';
import { ROLE_PERMISSIONS } from './permission-map';
import type { Permission } from './permission.types';

interface PermissionRequest extends Request {
  organizationContext?: OrganizationContext;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PermissionRequest>();

    if (!request.organizationContext) {
      throw new UnauthorizedException('Organization context is required');
    }

    const grantedPermissions =
      ROLE_PERMISSIONS[request.organizationContext.role];

    const hasPermission = requiredPermissions.every((permission) =>
      grantedPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
