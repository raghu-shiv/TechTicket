import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketActivityType } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import {
  getTicketActivityCategory,
  getTicketActivityDescription,
  getTicketActivityTimeline,
  getTicketActivityActorPresentation,
  getTicketActivityTypesForCategory,
  type TicketActivityCategory,
} from './ticket-activity.presentation.js';

@Injectable()
export class TicketActivityService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(
    organizationId: string,
    ticketId: string,
    filters: {
      page?: number;
      limit?: number;
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

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const typeFilter =
      filters.type !== undefined || filters.category !== undefined
        ? {
            type: {
              ...(filters.type !== undefined && {
                equals: filters.type,
              }),
              ...(filters.category !== undefined && {
                in: getTicketActivityTypesForCategory(filters.category),
              }),
            },
          }
        : {};

    const activityWhere = {
      ticketId: ticket.id,
      organizationId,
      ...typeFilter,
      ...(filters.actorId !== undefined && {
        actorId: filters.actorId,
      }),
    };

    const [activities, total] = await Promise.all([
      this.database.ticketActivity.findMany({
        where: activityWhere,
        skip,
        take: limit,
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
      }),

      this.database.ticketActivity.count({
        where: activityWhere,
      }),
    ]);

    const data = activities.map((activity) => ({
      ...activity,
      category: getTicketActivityCategory(activity.type),
      timeline: getTicketActivityTimeline(activity.createdAt),
      description: getTicketActivityDescription(
        activity.type,
        activity.metadata as Record<string, unknown> | null,
      ),
      actorPresentation: getTicketActivityActorPresentation(activity.actor),
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
