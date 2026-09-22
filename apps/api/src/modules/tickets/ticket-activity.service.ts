import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketActivityType } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class TicketActivityService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(organizationId: string, ticketId: string) {
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

    return this.database.ticketActivity.findMany({
      where: {
        ticketId: ticket.id,
        organizationId,
      },
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
