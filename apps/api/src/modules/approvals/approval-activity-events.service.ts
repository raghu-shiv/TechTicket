import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TicketActivityType } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import { APPROVAL_EVENTS, type ApprovalActivityEvent } from './approval-events';

@Injectable()
export class ApprovalActivityEventsService {
  constructor(private readonly database: DatabaseService) {}

  @OnEvent(APPROVAL_EVENTS.REQUESTED)
  async handleRequested(event: ApprovalActivityEvent): Promise<void> {
    await this.createActivity(event, TicketActivityType.APPROVAL_REQUESTED);
  }

  @OnEvent(APPROVAL_EVENTS.APPROVED)
  async handleApproved(event: ApprovalActivityEvent): Promise<void> {
    await this.createActivity(event, TicketActivityType.APPROVAL_APPROVED);
  }

  @OnEvent(APPROVAL_EVENTS.REJECTED)
  async handleRejected(event: ApprovalActivityEvent): Promise<void> {
    await this.createActivity(event, TicketActivityType.APPROVAL_REJECTED);
  }

  @OnEvent(APPROVAL_EVENTS.CANCELLED)
  async handleCancelled(event: ApprovalActivityEvent): Promise<void> {
    await this.createActivity(event, TicketActivityType.APPROVAL_CANCELLED);
  }

  private async createActivity(
    event: ApprovalActivityEvent,
    type: TicketActivityType,
  ): Promise<void> {
    await this.database.ticketActivity.create({
      data: {
        ticketId: event.ticketId,
        organizationId: event.organizationId,
        actorId: event.actorId,
        type,
        metadata: {
          approvalId: event.approvalId,
          ticketNumber: event.ticketNumber,
          approverId: event.approverId,
          status: event.status,
          ...(event.comment !== null && {
            comment: event.comment,
          }),
        },
        createdAt: event.occurredAt,
      },
    });
  }
}
