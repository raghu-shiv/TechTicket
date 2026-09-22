import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string) {
    return this.database.membership.findMany({
      where: {
        userId,
      },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findByIdForUser(organizationId: string, userId: string) {
    const membership = await this.database.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found');
    }

    return membership;
  }

  async createForUser(
    userId: string,
    data: {
      name: string;
      slug: string;
      description?: string;
    },
  ) {
    const existing = await this.database.organization.findUnique({
      where: {
        slug: data.slug,
      },
    });

    if (existing) {
      throw new ConflictException('Organization slug already exists');
    }

    return this.database.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        memberships: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        memberships: true,
      },
    });
  }
}
