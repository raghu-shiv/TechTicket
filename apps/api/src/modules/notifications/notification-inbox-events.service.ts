import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  APPROVAL_EVENTS,
  type ApprovalActivityEvent,
} from '../approvals/approval-events';
import { TICKET_EVENTS } from '../tickets/ticket-events';
import type {
  TicketAssignmentNotificationEvent,
  TicketCommentNotificationEvent,
  TicketStatusNotificationEvent,
} from '../tickets/ticket-notification-events';

import { NotificationService } from './notification.service';
import type { NotificationType } from './notification-events';

interface NotificationEventContext {
  organizationId: string;
  actorId: string;
  ticketId: string;
  occurredAt?: Date;
}

interface NotificationContent {
  type: NotificationType;
  title: string;
  message: string;
}

@Injectable()
export class NotificationInboxEventsService {
  private readonly logger = new Logger(NotificationInboxEventsService.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent(TICKET_EVENTS.ASSIGNEE_CHANGED)
  async handleAssigneeChanged(
    event: TicketAssignmentNotificationEvent,
  ): Promise<void> {
    if (!event.recipientId || event.recipientId === event.actorId) {
      return;
    }

    await this.createForRecipients(event, [event.recipientId], {
      type: 'TICKET_ASSIGNED',
      title: 'Ticket assigned to you',
      message: 'A ticket has been assigned to you.',
    });
  }

  @OnEvent(TICKET_EVENTS.STATUS_CHANGED)
  async handleStatusChanged(
    event: TicketStatusNotificationEvent,
  ): Promise<void> {
    await this.createForRecipients(event, event.recipientIds, {
      type: 'TICKET_STATUS_CHANGED',
      title: 'Ticket status changed',
      message:
        `Ticket status changed from ${event.fromStatus} ` +
        `to ${event.toStatus}.`,
    });
  }

  @OnEvent(TICKET_EVENTS.COMMENT_ADDED)
  async handleCommentAdded(
    event: TicketCommentNotificationEvent,
  ): Promise<void> {
    await this.createCommentNotifications(
      event,
      'TICKET_COMMENT_ADDED',
      'New comment',
      'A new comment was added to a ticket.',
    );
  }

  @OnEvent(TICKET_EVENTS.COMMENT_UPDATED)
  async handleCommentUpdated(
    event: TicketCommentNotificationEvent,
  ): Promise<void> {
    await this.createCommentNotifications(
      event,
      'TICKET_COMMENT_UPDATED',
      'Comment updated',
      'A comment on a ticket was updated.',
    );
  }

  @OnEvent(TICKET_EVENTS.COMMENT_DELETED)
  async handleCommentDeleted(
    event: TicketCommentNotificationEvent,
  ): Promise<void> {
    await this.createCommentNotifications(
      event,
      'TICKET_COMMENT_DELETED',
      'Comment deleted',
      'A comment on a ticket was deleted.',
    );
  }

  @OnEvent(APPROVAL_EVENTS.REQUESTED)
  async handleApprovalRequested(event: ApprovalActivityEvent): Promise<void> {
    await this.createForRecipients(event, [event.approverId], {
      type: 'APPROVAL_REQUESTED',
      title: 'Approval requested',
      message:
        `An approval has been requested for ticket ` + `${event.ticketNumber}.`,
    });
  }

  @OnEvent(APPROVAL_EVENTS.APPROVED)
  async handleApprovalApproved(event: ApprovalActivityEvent): Promise<void> {
    await this.createForRecipients(event, [event.requesterId], {
      type: 'APPROVAL_APPROVED',
      title: 'Approval approved',
      message:
        `The approval request for ticket ${event.ticketNumber} ` +
        'has been approved.',
    });
  }

  @OnEvent(APPROVAL_EVENTS.REJECTED)
  async handleApprovalRejected(event: ApprovalActivityEvent): Promise<void> {
    await this.createForRecipients(event, [event.requesterId], {
      type: 'APPROVAL_REJECTED',
      title: 'Approval rejected',
      message:
        `The approval request for ticket ${event.ticketNumber} ` +
        'has been rejected.',
    });
  }

  @OnEvent(APPROVAL_EVENTS.CANCELLED)
  async handleApprovalCancelled(event: ApprovalActivityEvent): Promise<void> {
    await this.createForRecipients(event, [event.approverId], {
      type: 'APPROVAL_CANCELLED',
      title: 'Approval cancelled',
      message:
        `The approval request for ticket ${event.ticketNumber} ` +
        'has been cancelled.',
    });
  }

  private async createCommentNotifications(
    event: TicketCommentNotificationEvent,
    type:
      | 'TICKET_COMMENT_ADDED'
      | 'TICKET_COMMENT_UPDATED'
      | 'TICKET_COMMENT_DELETED',
    title: string,
    message: string,
  ): Promise<void> {
    await this.createForRecipients(event, event.recipientIds, {
      type,
      title,
      message,
    });
  }

  private async createForRecipients(
    event: NotificationEventContext,
    rawRecipientIds: Array<string | null | undefined>,
    content: NotificationContent,
  ): Promise<void> {
    const recipients = [
      ...new Set(
        rawRecipientIds.filter(
          (recipientId): recipientId is string =>
            typeof recipientId === 'string' &&
            recipientId.length > 0 &&
            recipientId !== event.actorId,
        ),
      ),
    ];

    if (recipients.length === 0) {
      return;
    }

    const outcomes = await Promise.allSettled(
      recipients.map((recipientId) =>
        this.notificationService.createNotification({
          organizationId: event.organizationId,
          recipientId,
          actorId: event.actorId,
          ticketId: event.ticketId,
          occurredAt: event.occurredAt,
          ...content,
        }),
      ),
    );

    for (const outcome of outcomes) {
      if (outcome.status === 'rejected') {
        this.logger.error(
          'Failed to persist an in-app notification.',
          outcome.reason instanceof Error
            ? outcome.reason.stack
            : String(outcome.reason),
        );
      }
    }
  }
}
