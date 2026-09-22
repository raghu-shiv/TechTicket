import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketPriority } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

interface SlaPolicyTargetInput {
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

interface CreateSlaPolicyInput {
  name: string;
  targets: SlaPolicyTargetInput[];
}

interface UpdateSlaPolicyInput {
  name?: string;
  targets?: SlaPolicyTargetInput[];
}

const REQUIRED_PRIORITIES: TicketPriority[] = [
  TicketPriority.LOW,
  TicketPriority.MEDIUM,
  TicketPriority.HIGH,
  TicketPriority.URGENT,
];

@Injectable()
export class SlaPolicyService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(context: OrganizationContext) {
    return this.database.slaPolicy.findMany({
      where: {
        organizationId: context.organizationId,
      },
      orderBy: [
        {
          isActive: 'desc',
        },
        {
          name: 'asc',
        },
      ],
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        targets: {
          orderBy: {
            priority: 'asc',
          },
          select: {
            id: true,
            priority: true,
            firstResponseMinutes: true,
            resolutionMinutes: true,
          },
        },
      },
    });
  }

  async findOne(context: OrganizationContext, policyId: string) {
    const policy = await this.database.slaPolicy.findFirst({
      where: {
        id: policyId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        targets: {
          orderBy: {
            priority: 'asc',
          },
          select: {
            id: true,
            priority: true,
            firstResponseMinutes: true,
            resolutionMinutes: true,
          },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException('SLA policy not found');
    }

    return policy;
  }

  async create(context: OrganizationContext, input: CreateSlaPolicyInput) {
    const name = input.name.trim();

    if (!name) {
      throw new BadRequestException('SLA policy name is required');
    }

    this.validateTargets(input.targets);

    const existing = await this.database.slaPolicy.findFirst({
      where: {
        organizationId: context.organizationId,
        name,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'An SLA policy with this name already exists',
      );
    }

    return this.database.slaPolicy.create({
      data: {
        organizationId: context.organizationId,
        name,
        targets: {
          create: input.targets.map((target) => ({
            priority: target.priority,
            firstResponseMinutes: target.firstResponseMinutes,
            resolutionMinutes: target.resolutionMinutes,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        targets: {
          orderBy: {
            priority: 'asc',
          },
          select: {
            id: true,
            priority: true,
            firstResponseMinutes: true,
            resolutionMinutes: true,
          },
        },
      },
    });
  }

  async update(
    context: OrganizationContext,
    policyId: string,
    input: UpdateSlaPolicyInput,
  ) {
    const policy = await this.database.slaPolicy.findFirst({
      where: {
        id: policyId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!policy) {
      throw new NotFoundException('SLA policy not found');
    }

    if (input.name === undefined && input.targets === undefined) {
      throw new BadRequestException('No fields provided for update');
    }

    if (input.targets !== undefined) {
      this.validateTargets(input.targets);
    }

    const name = input.name?.trim();

    if (input.name !== undefined && !name) {
      throw new BadRequestException('SLA policy name cannot be empty');
    }

    if (name !== undefined && name !== policy.name) {
      const existing = await this.database.slaPolicy.findFirst({
        where: {
          organizationId: context.organizationId,
          name,
          NOT: {
            id: policy.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        throw new ConflictException(
          'An SLA policy with this name already exists',
        );
      }
    }

    if (policy.isActive && input.targets !== undefined) {
      throw new ConflictException(
        'Deactivate the SLA policy before changing its targets',
      );
    }

    return this.database.$transaction(async (tx) => {
      if (input.targets !== undefined) {
        await tx.slaPolicyTarget.deleteMany({
          where: {
            policyId: policy.id,
          },
        });

        await tx.slaPolicyTarget.createMany({
          data: input.targets.map((target) => ({
            policyId: policy.id,
            priority: target.priority,
            firstResponseMinutes: target.firstResponseMinutes,
            resolutionMinutes: target.resolutionMinutes,
          })),
        });
      }

      return tx.slaPolicy.update({
        where: {
          id: policy.id,
        },
        data: {
          ...(name !== undefined && {
            name,
          }),
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          targets: {
            orderBy: {
              priority: 'asc',
            },
            select: {
              id: true,
              priority: true,
              firstResponseMinutes: true,
              resolutionMinutes: true,
            },
          },
        },
      });
    });
  }

  async activate(context: OrganizationContext, policyId: string) {
    const policy = await this.database.slaPolicy.findFirst({
      where: {
        id: policyId,
        organizationId: context.organizationId,
      },
      include: {
        targets: {
          select: {
            priority: true,
          },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException('SLA policy not found');
    }

    if (policy.isActive) {
      throw new BadRequestException('SLA policy is already active');
    }

    this.validatePriorityCompleteness(policy.targets);

    const activePolicy = await this.database.slaPolicy.findFirst({
      where: {
        organizationId: context.organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (activePolicy) {
      throw new ConflictException(
        `SLA policy "${activePolicy.name}" is already active for this organization`,
      );
    }

    return this.database.slaPolicy.update({
      where: {
        id: policy.id,
      },
      data: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deactivate(context: OrganizationContext, policyId: string) {
    const policy = await this.database.slaPolicy.findFirst({
      where: {
        id: policyId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!policy) {
      throw new NotFoundException('SLA policy not found');
    }

    if (!policy.isActive) {
      throw new BadRequestException('SLA policy is already inactive');
    }

    return this.database.slaPolicy.update({
      where: {
        id: policy.id,
      },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(context: OrganizationContext, policyId: string) {
    const policy = await this.database.slaPolicy.findFirst({
      where: {
        id: policyId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!policy) {
      throw new NotFoundException('SLA policy not found');
    }

    if (policy.isActive) {
      throw new ConflictException(
        'Active SLA policies cannot be deleted. Deactivate the policy first.',
      );
    }

    await this.database.slaPolicy.delete({
      where: {
        id: policy.id,
      },
    });

    return {
      success: true,
      policyId: policy.id,
    };
  }

  private validateTargets(targets: SlaPolicyTargetInput[]) {
    if (targets.length !== REQUIRED_PRIORITIES.length) {
      throw new BadRequestException(
        'An SLA policy must contain exactly one target for each priority',
      );
    }

    const priorities = targets.map((target) => target.priority);
    const uniquePriorities = new Set(priorities);

    if (uniquePriorities.size !== REQUIRED_PRIORITIES.length) {
      throw new BadRequestException(
        'An SLA policy cannot contain duplicate priority targets',
      );
    }

    this.validatePriorityCompleteness(
      targets.map((target) => ({
        priority: target.priority,
      })),
    );

    for (const target of targets) {
      if (target.firstResponseMinutes <= 0 || target.resolutionMinutes <= 0) {
        throw new BadRequestException(
          'SLA target minutes must be greater than zero',
        );
      }

      if (target.firstResponseMinutes > target.resolutionMinutes) {
        throw new BadRequestException(
          `First response SLA cannot exceed resolution SLA for ${target.priority}`,
        );
      }
    }
  }

  private validatePriorityCompleteness(
    targets: Array<{ priority: TicketPriority }>,
  ) {
    const configured = new Set(targets.map((target) => target.priority));

    const missing = REQUIRED_PRIORITIES.filter(
      (priority) => !configured.has(priority),
    );

    if (missing.length > 0) {
      throw new BadRequestException(
        `SLA policy is missing targets for: ${missing.join(', ')}`,
      );
    }
  }
}
