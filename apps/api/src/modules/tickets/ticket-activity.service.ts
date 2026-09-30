import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketActivityType } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import {
  getTicketActivityCategory,
  getTicketActivityDescription,
  getTicketActivityTimeline,
  getTicketActivityActorPresentation,
  type TicketActivityCategory,
} from './ticket-activity.presentation.js';

@Injectable()
export class TicketActivityService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(
    organizationId: string,
    ticketId: string,
    filters: {
      type?: TicketActivityType;
      category?: TicketActivityCategory;
      actorId?: string;
    } = {},
  ) {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const activityWhere = {
      ticketId: ticket.id,
      organizationId,
      ...(filters.type !== undefined && {
        type: filters.type,
      }),
      ...(filters.actorId !== undefined && {
        actorId: filters.actorId,
      }),
    };
    const activities = await this.database.ticketActivity.findMany({
      where: activityWhere,
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        ticketId: true,
        organizationId: true,
        actorId: true,
        type: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const presentedActivities = activities.map((activity) => ({
      ...activity,
      category: getTicketActivityCategory(activity.type),
      timeline: getTicketActivityTimeline(activity.createdAt),
      description: getTicketActivityDescription(
        activity.type,
        activity.metadata as Record<string, unknown> | null,
      ),
      actorPresentation: getTicketActivityActorPresentation(activity.actor),
    }));

    return filters.category === undefined
      ? presentedActivities
      : presentedActivities.filter(
          (activity) => activity.category === filters.category,
        );
  }

  async create(input: {
    ticketId: string;
    organizationId: string;
    actorId?: string | null;
    type: TicketActivityType;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.database.ticketActivity.create({
      data: {
        ticketId: input.ticketId,
        organizationId: input.organizationId,
        actorId: input.actorId ?? null,
        type: input.type,
        ...(input.metadata !== undefined && {
          metadata: input.metadata,
        }),
      },
    });
  }
}
