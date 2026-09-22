import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TicketActivityType } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';

interface SlaEscalationEvent {
  escalationId: string;
  ticketId: string;
  ticketSlaId: string;
  type: string;
  occurredAt: Date;
}

@Injectable()
export class TicketActivityEventsService {
  constructor(private readonly database: DatabaseService) {}

  @OnEvent('ticket.sla.first_response_breached')
  async handleFirstResponseBreach(event: SlaEscalationEvent): Promise<void> {
    const sla = await this.database.ticketSla.findUnique({
      where: {
        id: event.ticketSlaId,
      },
      select: {
        ticket: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!sla) {
      return;
    }

    await this.database.ticketActivity.create({
      data: {
        ticketId: event.ticketId,
        organizationId: sla.ticket.organizationId,
        actorId: null,
        type: TicketActivityType.SLA_FIRST_RESPONSE_BREACHED,
        metadata: {
          escalationId: event.escalationId,
          ticketSlaId: event.ticketSlaId,
        },
        createdAt: event.occurredAt,
      },
    });
  }

  @OnEvent('ticket.sla.resolution_breached')
  async handleResolutionBreach(event: SlaEscalationEvent): Promise<void> {
    const sla = await this.database.ticketSla.findUnique({
      where: {
        id: event.ticketSlaId,
      },
      select: {
        ticket: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!sla) {
      return;
    }

    await this.database.ticketActivity.create({
      data: {
        ticketId: event.ticketId,
        organizationId: sla.ticket.organizationId,
        actorId: null,
        type: TicketActivityType.SLA_RESOLUTION_BREACHED,
        metadata: {
          escalationId: event.escalationId,
          ticketSlaId: event.ticketSlaId,
        },
        createdAt: event.occurredAt,
      },
    });
  }
}
