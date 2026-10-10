import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  Prisma,
  TicketPriority,
  TicketType,
  TicketStatus,
  TicketCommentType,
  TicketActivityType,
} from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';
import { TicketActivityService } from './ticket-activity.service';
import { TICKET_EVENTS } from './ticket-events';
import {
  buildTicketLibraryWhere,
  type TicketLibraryFilters,
} from './ticket-library-query';

interface CreateTicketInput {
  title: string;
  description: string;
  priority?: TicketPriority;
  type?: TicketType;
  productId?: string;
}

interface UpdateTicketInput {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  type?: TicketType;
  productId?: string | null;
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly ticketActivityService: TicketActivityService,
  ) {}

  async findAll(
    context: OrganizationContext,
    filters: TicketLibraryFilters = {},
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    if (filters.assigneeId !== undefined && filters.unassigned !== undefined) {
      throw new BadRequestException(
        'assigneeId cannot be used with unassigned',
      );
    }

    if (filters.teamId !== undefined && filters.unassignedTeam !== undefined) {
      throw new BadRequestException(
        'teamId cannot be used with unassignedTeam',
      );
    }

    const createdFrom = filters.createdFrom
      ? new Date(filters.createdFrom)
      : undefined;

    const createdTo = filters.createdTo
      ? /^\d{4}-\d{2}-\d{2}$/.test(filters.createdTo)
        ? new Date(`${filters.createdTo}T23:59:59.999Z`)
        : new Date(filters.createdTo)
      : undefined;

    const updatedFrom = filters.updatedFrom
      ? new Date(filters.updatedFrom)
      : undefined;

    const updatedTo = filters.updatedTo
      ? /^\d{4}-\d{2}-\d{2}$/.test(filters.updatedTo)
        ? new Date(`${filters.updatedTo}T23:59:59.999Z`)
        : new Date(filters.updatedTo)
      : undefined;

    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException(
        'createdFrom cannot be later than createdTo',
      );
    }

    if (updatedFrom && updatedTo && updatedFrom > updatedTo) {
      throw new BadRequestException(
        'updatedFrom cannot be later than updatedTo',
      );
    }

    const sortBy = filters.sortBy ?? 'createdAt';
    const sortOrder = filters.sortOrder ?? 'desc';

    const orderBy = {
      [sortBy]: sortOrder,
    } as {
      [key: string]: 'asc' | 'desc';
    };

    const where = buildTicketLibraryWhere(context, filters);

    const [tickets, total] = await Promise.all([
      this.database.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          ticketNumber: true,
          organizationId: true,
          requesterId: true,
          assigneeId: true,
          teamId: true,
          productId: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
          closedAt: true,

          sla: {
            select: {
              id: true,
              firstResponseMinutes: true,
              resolutionMinutes: true,
              firstResponseDueAt: true,
              resolutionDueAt: true,
              firstRespondedAt: true,
              firstResponseBreachedAt: true,
              resolutionBreachedAt: true,

              slaEscalations: {
                orderBy: {
                  createdAt: 'desc',
                },
                select: {
                  id: true,
                  type: true,
                  createdAt: true,
                },
              },
            },
          },

          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          team: {
            select: {
              id: true,
              name: true,
            },
          },

          product: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      }),

      this.database.ticket.count({
        where,
      }),
    ]);

    return {
      data: tickets,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(context: OrganizationContext, ticketId: string) {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        ticketNumber: true,
        organizationId: true,
        requesterId: true,
        assigneeId: true,
        teamId: true,
        productId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true,
        sla: {
          select: {
            id: true,
            firstResponseMinutes: true,
            resolutionMinutes: true,
            firstResponseDueAt: true,
            resolutionDueAt: true,
            firstRespondedAt: true,
            firstResponseBreachedAt: true,
            resolutionBreachedAt: true,
            createdAt: true,
            updatedAt: true,

            slaEscalations: {
              orderBy: {
                createdAt: 'desc',
              },
              select: {
                id: true,
                type: true,
                createdAt: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        team: {
          select: {
            id: true,
            name: true,
          },
        },

        product: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async assertRealtimeAccess(context: OrganizationContext, ticketId: string) {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        requesterId: true,
        assigneeId: true,
        teamId: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const canAccess =
      context.role === 'OWNER' ||
      context.role === 'ADMIN' ||
      context.role === 'AGENT' ||
      ticket.requesterId === context.userId ||
      ticket.assigneeId === context.userId;

    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  async create(context: OrganizationContext, input: CreateTicketInput) {
    const title = input.title.trim();
    const description = input.description.trim();

    if (!title) {
      throw new BadRequestException('Ticket title is required');
    }

    if (!description) {
      throw new BadRequestException('Ticket description is required');
    }

    const priority = input.priority ?? TicketPriority.MEDIUM;
    const type = input.type ?? TicketType.INCIDENT;

    const ticketNumber = await this.generateTicketNumber(
      context.organizationId,
    );

    const activePolicy = await this.database.slaPolicy.findFirst({
      where: {
        organizationId: context.organizationId,
        isActive: true,
      },
      include: {
        targets: {
          where: {
            priority,
          },
          select: {
            firstResponseMinutes: true,
            resolutionMinutes: true,
          },
        },
      },
    });

    if (activePolicy && activePolicy.targets.length === 0) {
      throw new ConflictException(
        `Active SLA policy "${activePolicy.name}" has no target configured for priority ${priority}`,
      );
    }

    const createdAt = new Date();

    const slaTarget = activePolicy?.targets[0];

    await this.validateProduct(context.organizationId, input.productId);

    const ticket = await this.database.ticket.create({
      data: {
        ticketNumber,
        organizationId: context.organizationId,
        requesterId: context.userId,
        productId: input.productId ?? null,
        title,
        description,
        priority,
        type,
        createdAt,

        ...(slaTarget
          ? {
              sla: {
                create: {
                  firstResponseMinutes: slaTarget.firstResponseMinutes,
                  resolutionMinutes: slaTarget.resolutionMinutes,
                  firstResponseDueAt: new Date(
                    createdAt.getTime() +
                      slaTarget.firstResponseMinutes * 60 * 1000,
                  ),
                  resolutionDueAt: new Date(
                    createdAt.getTime() +
                      slaTarget.resolutionMinutes * 60 * 1000,
                  ),
                },
              },
            }
          : {}),
      },

      select: {
        id: true,
        ticketNumber: true,
        organizationId: true,
        requesterId: true,
        assigneeId: true,
        teamId: true,
        productId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true,
        sla: {
          select: {
            id: true,
            firstResponseMinutes: true,
            resolutionMinutes: true,
            firstResponseDueAt: true,
            resolutionDueAt: true,
            firstRespondedAt: true,
            firstResponseBreachedAt: true,
            resolutionBreachedAt: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    await this.ticketActivityService.create({
      ticketId: ticket.id,
      organizationId: context.organizationId,
      actorId: context.userId,
      type: TicketActivityType.TICKET_CREATED,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        priority: ticket.priority,
        type: ticket.type,
      },
    });

    this.eventEmitter.emit(TICKET_EVENTS.CREATED, {
      ticketId: ticket.id,
      organizationId: context.organizationId,
      actorId: context.userId,
    });
    return ticket;
  }

  async update(
    context: OrganizationContext,
    ticketId: string,
    input: UpdateTicketInput,
  ) {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        priority: true,
        type: true,
        productId: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const data: UpdateTicketInput = {};

    if (input.title !== undefined) {
      const title = input.title.trim();

      if (!title) {
        throw new BadRequestException('Ticket title cannot be empty');
      }

      data.title = title;
    }

    if (input.description !== undefined) {
      const description = input.description.trim();

      if (!description) {
        throw new BadRequestException('Ticket description cannot be empty');
      }

      data.description = description;
    }

    if (input.priority !== undefined) {
      data.priority = input.priority;
    }

    if (input.type !== undefined) {
      data.type = input.type;
    }

    if (input.productId !== undefined) {
      await this.validateProduct(context.organizationId, input.productId);
      data.productId = input.productId;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const changedFields: Record<string, Prisma.InputJsonValue> = {};

    if (data.title !== undefined && data.title !== ticket.title) {
      changedFields.title = { from: ticket.title, to: data.title };
    }

    if (
      data.description !== undefined &&
      data.description !== ticket.description
    ) {
      changedFields.description = {
        from: ticket.description,
        to: data.description,
      };
    }

    if (data.priority !== undefined && data.priority !== ticket.priority) {
      changedFields.priority = {
        from: ticket.priority,
        to: data.priority,
      };
    }

    if (data.type !== undefined && data.type !== ticket.type) {
      changedFields.type = { from: ticket.type, to: data.type };
    }

    if (data.productId !== undefined && data.productId !== ticket.productId) {
      changedFields.productId = {
        from: ticket.productId ?? null,
        to: data.productId ?? null,
      } as Prisma.InputJsonValue;
    }

    const updatedTicket = await this.database.ticket.update({
      where: { id: ticket.id },
      data,
      select: {
        id: true,
        ticketNumber: true,
        organizationId: true,
        requesterId: true,
        assigneeId: true,
        teamId: true,
        productId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true,

        product: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (Object.keys(changedFields).length > 0) {
      const activityType =
        changedFields.priority !== undefined
          ? TicketActivityType.PRIORITY_CHANGED
          : TicketActivityType.TICKET_UPDATED;

      await this.ticketActivityService.create({
        ticketId: ticket.id,
        organizationId: context.organizationId,
        actorId: context.userId,
        type: activityType,
        metadata: changedFields,
      });

      this.eventEmitter.emit(
        changedFields.priority !== undefined
          ? TICKET_EVENTS.PRIORITY_CHANGED
          : TICKET_EVENTS.UPDATED,
        {
          ticketId: ticket.id,
          organizationId: context.organizationId,
          actorId: context.userId,
          changes: changedFields,
        },
      );
    }

    return updatedTicket;
  }

  async updateAssignment(
    context: OrganizationContext,
    ticketId: string,
    assigneeId: string | null | undefined,
    teamId: string | null | undefined,
  ) {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        assigneeId: true,
        teamId: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    /*
     * Preserve the existing assignment state before making changes.
     * These values are used by both audit history and notification events.
     */
    const previousAssigneeId = ticket.assigneeId;
    const previousTeamId = ticket.teamId;

    let validatedAssigneeId = ticket.assigneeId;
    let validatedTeamId = ticket.teamId;

    /*
     * Validate assignee.
     *
     * undefined = don't change the assignee
     * null      = remove the current assignee
     */
    if (assigneeId !== undefined) {
      validatedAssigneeId = assigneeId;

      if (assigneeId !== null) {
        const assigneeMembership = await this.database.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: assigneeId,
              organizationId: context.organizationId,
            },
          },
          select: {
            userId: true,
            role: true,
          },
        });

        if (!assigneeMembership) {
          throw new BadRequestException(
            'Assignee must be a member of this organization',
          );
        }

        if (assigneeMembership.role === 'REQUESTER') {
          throw new BadRequestException(
            'REQUESTER users cannot be assigned tickets',
          );
        }
      }
    }

    /*
     * Validate team.
     *
     * undefined = don't change the team
     * null      = remove the current team
     */
    if (teamId !== undefined) {
      validatedTeamId = teamId;

      if (teamId !== null) {
        const team = await this.database.team.findFirst({
          where: {
            id: teamId,
            organizationId: context.organizationId,
            isActive: true,
          },
          select: {
            id: true,
          },
        });

        if (!team) {
          throw new BadRequestException('Team not found or inactive');
        }
      }
    }

    /*
     * Preserve the existing rule:
     * if both assignee and team are set, the assignee must belong
     * to the selected team.
     */
    if (validatedAssigneeId !== null && validatedTeamId !== null) {
      const teamMembership = await this.database.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: validatedTeamId,
            userId: validatedAssigneeId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!teamMembership) {
        throw new BadRequestException(
          'Assignee must be a member of the selected team',
        );
      }
    }

    const updateData: {
      assigneeId?: string | null;
      teamId?: string | null;
    } = {};

    if (assigneeId !== undefined) {
      updateData.assigneeId = validatedAssigneeId;
    }

    if (teamId !== undefined) {
      updateData.teamId = validatedTeamId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No assignment fields provided');
    }

    /*
     * Determine what actually changed before updating the database.
     */
    const assigneeChanged =
      assigneeId !== undefined && previousAssigneeId !== validatedAssigneeId;

    const teamChanged =
      teamId !== undefined && previousTeamId !== validatedTeamId;

    /*
     * Update the ticket first.
     *
     * Events are emitted only after this succeeds.
     */
    const updatedTicket = await this.database.ticket.update({
      where: {
        id: ticket.id,
      },
      data: updateData,
      select: {
        id: true,
        ticketNumber: true,
        organizationId: true,
        requesterId: true,
        assigneeId: true,
        teamId: true,
        productId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },

        product: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    /*
     * Preserve the existing audit history for assignee changes.
     */
    if (assigneeChanged) {
      await this.ticketActivityService.create({
        ticketId: ticket.id,
        organizationId: context.organizationId,
        actorId: context.userId,
        type: TicketActivityType.ASSIGNEE_CHANGED,
        metadata: {
          from: previousAssigneeId,
          to: validatedAssigneeId,
        },
      });

      /*
       * Emit the assignment notification event.
       *
       * The new assignee is the recipient.
       *
       * If the ticket is being unassigned, recipientId is null
       * and the notification listener will ignore the event.
       */
      this.eventEmitter.emit(TICKET_EVENTS.ASSIGNEE_CHANGED, {
        ticketId: ticket.id,
        organizationId: context.organizationId,
        actorId: context.userId,
        recipientId: validatedAssigneeId,
        assigneeId: validatedAssigneeId,
        previousAssigneeId,
        teamId: validatedTeamId,
        previousTeamId,
        activityType: TicketActivityType.ASSIGNEE_CHANGED,
        occurredAt: new Date(),
      });
    }

    /*
     * Preserve the existing audit history for team changes.
     */
    if (teamChanged) {
      await this.ticketActivityService.create({
        ticketId: ticket.id,
        organizationId: context.organizationId,
        actorId: context.userId,
        type: TicketActivityType.TEAM_CHANGED,
        metadata: {
          from: previousTeamId,
          to: validatedTeamId,
        },
      });

      /*
       * Keep TEAM_CHANGED as a separate event.
       */
      this.eventEmitter.emit(TICKET_EVENTS.TEAM_CHANGED, {
        ticketId: ticket.id,
        organizationId: context.organizationId,
        actorId: context.userId,
        teamId: validatedTeamId,
        previousTeamId,
        activityType: TicketActivityType.TEAM_CHANGED,
        occurredAt: new Date(),
      });
    }

    return updatedTicket;
  }

  async updateStatus(
    context: OrganizationContext,
    ticketId: string,
    status: TicketStatus,
  ) {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        ticketNumber: true,
        organizationId: true,
        requesterId: true,
        assigneeId: true,
        teamId: true,
        productId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === status) {
      throw new BadRequestException(`Ticket is already in ${status} status`);
    }

    const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
      OPEN: ['IN_PROGRESS', 'PENDING'],
      IN_PROGRESS: ['PENDING', 'RESOLVED'],
      PENDING: ['IN_PROGRESS', 'RESOLVED'],
      RESOLVED: ['CLOSED', 'IN_PROGRESS'],
      CLOSED: [],
    };

    if (!allowedTransitions[ticket.status].includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${ticket.status} to ${status}`,
      );
    }

    const previousStatus = ticket.status;
    const now = new Date();

    const updateData: {
      status: TicketStatus;
      resolvedAt?: Date | null;
      closedAt?: Date | null;
    } = {
      status,
    };

    /*
     * Preserve existing resolution/closure timestamp logic.
     *
     * RESOLVED:
     * - Set resolvedAt to the current time.
     * - Clear closedAt.
     */
    if (status === TicketStatus.RESOLVED) {
      updateData.resolvedAt = now;
      updateData.closedAt = null;
    }

    /*
     * CLOSED:
     * - Set closedAt to the current time.
     * - If the ticket was never resolved, also set resolvedAt.
     */
    if (status === TicketStatus.CLOSED) {
      updateData.closedAt = now;

      if (!ticket.resolvedAt) {
        updateData.resolvedAt = now;
      }
    }

    /*
     * Reopening:
     * - IN_PROGRESS and PENDING represent active states.
     * - Clear resolvedAt and closedAt when reopening a resolved/closed ticket.
     */
    if (
      status === TicketStatus.IN_PROGRESS ||
      status === TicketStatus.PENDING
    ) {
      updateData.resolvedAt = null;
      updateData.closedAt = null;
    }

    /*
     * Persist the status change first.
     *
     * The notification event is emitted only after this update
     * succeeds.
     */
    const updatedTicket = await this.database.ticket.update({
      where: {
        id: ticket.id,
      },
      data: updateData,
      select: {
        id: true,
        ticketNumber: true,
        organizationId: true,
        requesterId: true,
        assigneeId: true,
        teamId: true,
        productId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },

        product: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    /*
     * Preserve the existing audit-history behavior.
     */
    await this.ticketActivityService.create({
      ticketId: ticket.id,
      organizationId: context.organizationId,
      actorId: context.userId,
      type: TicketActivityType.STATUS_CHANGED,
      metadata: {
        from: previousStatus,
        to: status,
      },
    });

    /*
     * Determine who should receive a status-change notification.
     *
     * Current policy:
     * - Ticket requester
     * - Current ticket assignee, when assigned
     *
     * Remove duplicates in case requester and assignee are
     * the same user.
     */
    const recipientIds = [
      ticket.requesterId,
      ...(ticket.assigneeId ? [ticket.assigneeId] : []),
    ].filter((id, index, ids) => ids.indexOf(id) === index);

    /*
     * Emit the status-change notification event.
     *
     * This uses the existing TICKET_EVENTS.STATUS_CHANGED event.
     * The actual notification listener is responsible for handling
     * delivery later.
     */
    this.eventEmitter.emit(TICKET_EVENTS.STATUS_CHANGED, {
      ticketId: ticket.id,
      organizationId: context.organizationId,
      actorId: context.userId,
      recipientIds,
      fromStatus: previousStatus,
      toStatus: status,
      occurredAt: now,
    });

    return updatedTicket;
  }

  async findComments(context: OrganizationContext, ticketId: string) {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const canViewInternal =
      context.role === 'OWNER' ||
      context.role === 'ADMIN' ||
      context.role === 'AGENT';

    return this.database.ticketComment.findMany({
      where: {
        ticketId: ticket.id,
        ...(canViewInternal
          ? {}
          : {
              type: TicketCommentType.PUBLIC,
            }),
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        ticketId: true,
        authorId: true,
        body: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async createComment(
    context: OrganizationContext,
    ticketId: string,
    body: string,
    type: TicketCommentType = TicketCommentType.PUBLIC,
  ) {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: context.organizationId,
      },
      select: { id: true, requesterId: true, assigneeId: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (type === TicketCommentType.INTERNAL && context.role === 'REQUESTER') {
      throw new ForbiddenException(
        'REQUESTER users cannot create internal comments',
      );
    }

    const normalizedBody = body.trim();

    if (!normalizedBody) {
      throw new BadRequestException('Comment body cannot be empty');
    }

    const isStaffResponse =
      type === TicketCommentType.PUBLIC &&
      (context.role === 'OWNER' ||
        context.role === 'ADMIN' ||
        context.role === 'AGENT');

    const comment = await this.database.$transaction(async (tx) => {
      const createdComment = await tx.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: context.userId,
          body: normalizedBody,
          type,
        },
        select: {
          id: true,
          ticketId: true,
          authorId: true,
          body: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, name: true, email: true } },
        },
      });

      if (isStaffResponse) {
        await tx.ticketSla.updateMany({
          where: {
            ticketId: ticket.id,
            firstRespondedAt: null,
          },
          data: {
            firstRespondedAt: createdComment.createdAt,
          },
        });
      }

      await tx.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          organizationId: context.organizationId,
          actorId: context.userId,
          type: TicketActivityType.COMMENT_ADDED,
          metadata: {
            commentId: createdComment.id,
            commentType: createdComment.type,
          },
        },
      });

      return createdComment;
    });

    const recipientIds = [
      ...(type === TicketCommentType.PUBLIC ? [ticket.requesterId] : []),
      ...(ticket.assigneeId ? [ticket.assigneeId] : []),
    ].filter(
      (id, index, ids) => id !== context.userId && ids.indexOf(id) === index,
    );

    this.eventEmitter.emit(TICKET_EVENTS.COMMENT_ADDED, {
      ticketId: ticket.id,
      organizationId: context.organizationId,
      actorId: context.userId,
      recipientIds,
      commentId: comment.id,
      commentType: comment.type,
      occurredAt: comment.createdAt,
    });

    return comment;
  }

  async updateComment(
    context: OrganizationContext,
    ticketId: string,
    commentId: string,
    body: string,
  ) {
    const comment = await this.database.ticketComment.findFirst({
      where: {
        id: commentId,
        ticketId,
        ticket: {
          organizationId: context.organizationId,
        },
      },
      select: {
        id: true,
        body: true,
        authorId: true,
        type: true,
        ticket: {
          select: {
            id: true,
            requesterId: true,
            assigneeId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isAdmin = context.role === 'OWNER' || context.role === 'ADMIN';

    if (!isAdmin && comment.authorId !== context.userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const normalizedBody = body.trim();

    if (!normalizedBody) {
      throw new BadRequestException('Comment body cannot be empty');
    }

    const updatedComment = await this.database.ticketComment.update({
      where: {
        id: comment.id,
      },
      data: {
        body: normalizedBody,
      },
      select: {
        id: true,
        ticketId: true,
        authorId: true,
        body: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    /*
     * Preserve existing audit history.
     */
    await this.ticketActivityService.create({
      ticketId,
      organizationId: context.organizationId,
      actorId: context.userId,
      type: TicketActivityType.COMMENT_UPDATED,
      metadata: {
        commentId: comment.id,
        from: comment.body,
        to: normalizedBody,
      },
    });

    /*
     * PUBLIC:
     *   requester + assignee
     *
     * INTERNAL:
     *   assignee only
     *
     * Never notify the user who edited the comment.
     */
    const recipientIds = [
      ...(comment.type === TicketCommentType.PUBLIC
        ? [comment.ticket.requesterId]
        : []),
      ...(comment.ticket.assigneeId ? [comment.ticket.assigneeId] : []),
    ].filter(
      (id, index, ids) => id !== context.userId && ids.indexOf(id) === index,
    );

    /*
     * Emit only after the database update and audit record
     * have succeeded.
     */
    this.eventEmitter.emit(TICKET_EVENTS.COMMENT_UPDATED, {
      ticketId,
      organizationId: context.organizationId,
      actorId: context.userId,
      recipientIds,
      commentId: updatedComment.id,
      commentType: updatedComment.type,
      occurredAt: updatedComment.updatedAt,
    });

    return updatedComment;
  }

  async removeComment(
    context: OrganizationContext,
    ticketId: string,
    commentId: string,
  ) {
    const comment = await this.database.ticketComment.findFirst({
      where: {
        id: commentId,
        ticketId,
        ticket: {
          organizationId: context.organizationId,
        },
      },
      select: {
        id: true,
        authorId: true,
        type: true,
        ticket: {
          select: {
            id: true,
            requesterId: true,
            assigneeId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isAdmin = context.role === 'OWNER' || context.role === 'ADMIN';

    if (!isAdmin && comment.authorId !== context.userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    /*
     * Capture the notification timestamp before deletion.
     *
     * The comment itself will no longer exist after the delete.
     */
    const occurredAt = new Date();

    await this.database.ticketComment.delete({
      where: {
        id: comment.id,
      },
    });

    /*
     * Preserve existing audit history.
     */
    await this.ticketActivityService.create({
      ticketId,
      organizationId: context.organizationId,
      actorId: context.userId,
      type: TicketActivityType.COMMENT_DELETED,
      metadata: {
        commentId: comment.id,
      },
    });

    /*
     * PUBLIC:
     *   requester + assignee
     *
     * INTERNAL:
     *   assignee only
     *
     * Never notify the user who deleted the comment.
     */
    const recipientIds = [
      ...(comment.type === TicketCommentType.PUBLIC
        ? [comment.ticket.requesterId]
        : []),
      ...(comment.ticket.assigneeId ? [comment.ticket.assigneeId] : []),
    ].filter(
      (id, index, ids) => id !== context.userId && ids.indexOf(id) === index,
    );

    /*
     * Emit after the delete and audit record succeed.
     */
    this.eventEmitter.emit(TICKET_EVENTS.COMMENT_DELETED, {
      ticketId,
      organizationId: context.organizationId,
      actorId: context.userId,
      recipientIds,
      commentId: comment.id,
      commentType: comment.type,
      occurredAt,
    });

    return {
      success: true,
    };
  }

  async remove(context: OrganizationContext, ticketId: string) {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.database.ticket.delete({
      where: {
        id: ticket.id,
      },
    });

    return {
      success: true,
      ticketId: ticket.id,
    };
  }

  private async generateTicketNumber(organizationId: string): Promise<string> {
    const latestTicket = await this.database.ticket.findFirst({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        ticketNumber: true,
      },
    });

    let nextNumber = 1;

    if (latestTicket) {
      const match = latestTicket.ticketNumber.match(/^TKT-(\d+)$/);

      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    const ticketNumber = `TKT-${String(nextNumber).padStart(6, '0')}`;

    const existing = await this.database.ticket.findUnique({
      where: {
        organizationId_ticketNumber: {
          organizationId,
          ticketNumber,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('Unable to generate a unique ticket number');
    }

    return ticketNumber;
  }

  private async validateProduct(
    organizationId: string,
    productId: string | null | undefined,
  ) {
    // undefined = product was not supplied, so leave the existing value unchanged.
    // null = explicitly clear the product, so no product validation is required.
    if (productId === undefined || productId === null) {
      return;
    }

    const product = await this.database.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException(
        'Inactive products cannot be assigned to tickets',
      );
    }
  }
}
