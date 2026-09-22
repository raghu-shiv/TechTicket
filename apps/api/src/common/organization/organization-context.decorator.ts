import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import type { OrganizationContext } from './organization.types';

interface OrganizationRequest extends Request {
  organizationContext?: OrganizationContext;
}

export const OrganizationContextParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrganizationContext => {
    const request = ctx.switchToHttp().getRequest<OrganizationRequest>();

    if (!request.organizationContext) {
      throw new UnauthorizedException('Organization context is required');
    }

    return request.organizationContext;
  },
);
