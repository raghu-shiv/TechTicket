import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

@Injectable()
export class TeamsService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(context: OrganizationContext) {
    return this.database.team.findMany({
      where: {
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(context: OrganizationContext, teamId: string) {
    const team = await this.database.team.findFirst({
      where: {
        id: teamId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        members: {
          select: {
            id: true,
            teamId: true,
            userId: true,
            createdAt: true,
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
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async create(
    context: OrganizationContext,
    name: string,
    description?: string,
  ) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Team name is required');
    }

    const existingTeam = await this.database.team.findUnique({
      where: {
        organizationId_name: {
          organizationId: context.organizationId,
          name: normalizedName,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingTeam) {
      throw new ConflictException(
        'A team with this name already exists in this organization',
      );
    }

    return this.database.team.create({
      data: {
        organizationId: context.organizationId,
        name: normalizedName,
        description: description?.trim() || null,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    context: OrganizationContext,
    teamId: string,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
    },
  ) {
    const team = await this.database.team.findFirst({
      where: {
        id: teamId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const updateData: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (data.name !== undefined) {
      const normalizedName = data.name.trim();

      if (!normalizedName) {
        throw new BadRequestException('Team name cannot be empty');
      }

      if (normalizedName !== team.name) {
        const duplicate = await this.database.team.findUnique({
          where: {
            organizationId_name: {
              organizationId: context.organizationId,
              name: normalizedName,
            },
          },
          select: {
            id: true,
          },
        });

        if (duplicate && duplicate.id !== team.id) {
          throw new ConflictException(
            'A team with this name already exists in this organization',
          );
        }
      }

      updateData.name = normalizedName;
    }

    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    return this.database.team.update({
      where: {
        id: team.id,
      },
      data: updateData,
      select: {
        id: true,
        organizationId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(context: OrganizationContext, teamId: string) {
    const team = await this.database.team.findFirst({
      where: {
        id: teamId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.database.team.delete({
      where: {
        id: team.id,
      },
    });

    return {
      success: true,
      teamId: team.id,
      organizationId: context.organizationId,
    };
  }

  async addMember(
    context: OrganizationContext,
    teamId: string,
    userId: string,
  ) {
    const team = await this.database.team.findFirst({
      where: {
        id: teamId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const membership = await this.database.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: context.organizationId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!membership) {
      throw new BadRequestException(
        'User must be an organization member before joining a team',
      );
    }

    const existingTeamMember = await this.database.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingTeamMember) {
      throw new ConflictException('User is already a member of this team');
    }

    return this.database.teamMember.create({
      data: {
        teamId: team.id,
        userId,
      },
      select: {
        id: true,
        teamId: true,
        userId: true,
        createdAt: true,
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

  async removeMember(
    context: OrganizationContext,
    teamId: string,
    userId: string,
  ) {
    const team = await this.database.team.findFirst({
      where: {
        id: teamId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const teamMember = await this.database.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }

    await this.database.teamMember.delete({
      where: {
        id: teamMember.id,
      },
    });

    return {
      success: true,
      teamId: team.id,
      userId,
    };
  }
}
