import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from './organization.types';

@Injectable()
export class OrganizationContextService {
  constructor(private readonly database: DatabaseService) {}

  async getContext(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationContext> {
    const membership = await this.database.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: {
        userId: true,
        organizationId: true,
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    return {
      userId: membership.userId,
      organizationId: membership.organizationId,
      role: membership.role,
    };
  }

  async getOrganization(userId: string, organizationId: string) {
    const context = await this.getContext(userId, organizationId);

    const organization = await this.database.organization.findUnique({
      where: {
        id: context.organizationId,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      context,
      organization,
    };
  }
}
