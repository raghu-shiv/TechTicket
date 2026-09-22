import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import type { Request } from 'express';

import type { OrganizationContext } from './organization.types';
import { ORGANIZATION_ROLES_KEY } from './organization-role.decorator';

interface OrganizationRequest extends Request {
  organizationContext?: OrganizationContext;
}

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      OrganizationContext['role'][]
    >(ORGANIZATION_ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<OrganizationRequest>();

    if (!request.organizationContext) {
      throw new UnauthorizedException('Organization context is required');
    }

    if (!requiredRoles.includes(request.organizationContext.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
