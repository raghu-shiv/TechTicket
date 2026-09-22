import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { Request } from 'express';

interface OrganizationRequest extends Request {
  organizationContext?: {
    organizationId: string;
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'AGENT' | 'REQUESTER';
  };
}

export const CurrentOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<OrganizationRequest>();

    return request.organizationContext?.organizationId;
  },
);
