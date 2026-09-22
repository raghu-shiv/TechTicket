import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import type { AuthContext } from '../auth/auth.types';
import { OrganizationContextService } from './organization-context.service';

interface OrganizationRequest extends Request {
  auth?: AuthContext;
  organizationContext?: {
    organizationId: string;
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'AGENT' | 'REQUESTER';
  };
}

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private readonly organizationContext: OrganizationContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OrganizationRequest>();

    if (!request.auth?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const organizationId = request.headers['x-organization-id'];

    if (typeof organizationId !== 'string' || !organizationId.trim()) {
      throw new UnauthorizedException('Organization context is required');
    }

    request.organizationContext = await this.organizationContext.getContext(
      request.auth.user.id,
      organizationId,
    );

    return true;
  }
}
