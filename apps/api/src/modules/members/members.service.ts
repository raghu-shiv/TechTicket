import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { SystemRole } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

@Injectable()
export class MembersService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(context: OrganizationContext) {
    return this.database.membership.findMany({
      where: {
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async searchMembers(
    context: OrganizationContext,
    rawSearch: string,
    limit = 8,
  ) {
    const search = rawSearch.trim().replace(/\s+/g, ' ');

    // Defense in depth: keep the service contract safe even when reused
    // outside the controller.
    if (search.length < 2 || search.length > 100) {
      throw new BadRequestException(
        'Search must contain between 2 and 100 characters.',
      );
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 8) {
      throw new BadRequestException(
        'Search result limit must be between 1 and 8.',
      );
    }

    const memberships = await this.database.membership.findMany({
      where: {
        // Always scope the query to the authenticated organization context.
        // Do not accept an organization ID from the search query.
        organizationId: context.organizationId,
        user: {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        },
      },
      select: {
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });

    // Deliberately return only the fields required by global search.
    // `id` is the User ID, which is also used by /users selection navigation.
    return memberships.map(({ userId, user }) => ({
      id: userId,
      displayName: user.name.trim() || user.email,
      email: user.email,
    }));
  }

  async addMember(
    context: OrganizationContext,
    email: string,
    role: SystemRole,
  ) {
    if (role === SystemRole.OWNER) {
      throw new ForbiddenException(
        'OWNER membership cannot be created through this endpoint',
      );
    }

    const user = await this.database.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
      },
    });

    if (!user) {
      throw new NotFoundException('No user exists with this email address');
    }

    const existingMembership = await this.database.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: context.organizationId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    return this.database.membership.create({
      data: {
        userId: user.id,
        organizationId: context.organizationId,
        role,
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
          },
        },
      },
    });
  }

  async updateRole(
    context: OrganizationContext,
    userId: string,
    newRole: SystemRole,
  ) {
    const membership = await this.database.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: context.organizationId,
        },
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization member not found');
    }

    if (context.userId === userId && newRole !== SystemRole.OWNER) {
      throw new BadRequestException(
        'You cannot remove your own OWNER privileges',
      );
    }

    if (
      context.role === 'ADMIN' &&
      (membership.role === SystemRole.OWNER || newRole === SystemRole.OWNER)
    ) {
      throw new ForbiddenException(
        'ADMIN users cannot modify OWNER membership',
      );
    }

    if (membership.role === SystemRole.OWNER) {
      if (newRole !== SystemRole.OWNER) {
        await this.ensureAnotherOwnerExists(
          context.organizationId,
          membership.userId,
        );
      }
    }

    return this.database.membership.update({
      where: {
        id: membership.id,
      },
      data: {
        role: newRole,
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
          },
        },
      },
    });
  }

  async removeMember(context: OrganizationContext, userId: string) {
    const membership = await this.database.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: context.organizationId,
        },
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization member not found');
    }

    if (context.userId === userId) {
      throw new BadRequestException(
        'You cannot remove yourself from the organization',
      );
    }

    if (context.role === 'ADMIN' && membership.role === SystemRole.OWNER) {
      throw new ForbiddenException('ADMIN users cannot remove an OWNER');
    }

    if (membership.role === SystemRole.OWNER) {
      await this.ensureAnotherOwnerExists(
        context.organizationId,
        membership.userId,
      );
    }

    await this.database.membership.delete({
      where: {
        id: membership.id,
      },
    });

    return {
      success: true,
      userId,
      organizationId: context.organizationId,
    };
  }

  private async ensureAnotherOwnerExists(
    organizationId: string,
    ownerUserId: string,
  ) {
    const ownerCount = await this.database.membership.count({
      where: {
        organizationId,
        role: SystemRole.OWNER,
        NOT: {
          userId: ownerUserId,
        },
      },
    });

    if (ownerCount === 0) {
      throw new BadRequestException(
        'The organization must have at least one OWNER',
      );
    }
  }

  async findEligibleStaff(context: OrganizationContext) {
    const memberships = await this.database.membership.findMany({
      where: {
        organizationId: context.organizationId,
        role: {
          in: [SystemRole.OWNER, SystemRole.ADMIN, SystemRole.AGENT],
        },
      },
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return memberships.map(({ userId, role, user }) => ({
      id: userId,
      name: user.name.trim() || user.email,
      email: user.email,
      role,
    }));
  }
}
