import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { NotificationQueueService } from '../notifications/queues/notification-queue.service';

import { TICKET_EVENTS } from './ticket-events';
import {
  TicketAssignmentNotificationEvent,
  TicketCommentNotificationEvent,
  TicketStatusNotificationEvent,
} from './ticket-notification-events';

@Injectable()
export class TicketNotificationEventsService {
  private readonly logger = new Logger(TicketNotificationEventsService.name);

  constructor(
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  @OnEvent(TICKET_EVENTS.ASSIGNEE_CHANGED)
  async handleAssigneeChanged(
    event: TicketAssignmentNotificationEvent,
  ): Promise<void> {
    if (!event.recipientId || event.recipientId === event.actorId) {
      return;
    }

    this.logger.log(
      `Assignment notification event: ticket=${event.ticketId}, recipient=${event.recipientId}`,
    );

    await this.sendNotificationEmails([event.recipientId], event.actorId, {
      subject: `Ticket assigned to you: ${event.ticketId}`,
      html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Ticket Assigned to You</h2>
            <p>
              Ticket <strong>${event.ticketId}</strong> has been assigned to you.
            </p>
            <p>
              Please open TechTicket to review the ticket and take the appropriate action.
            </p>
          </div>
        `,
      text: [
        'Ticket Assigned to You',
        '',
        `Ticket ${event.ticketId} has been assigned to you.`,
        '',
        'Please open TechTicket to review the ticket and take the appropriate action.',
      ].join('\n'),
    });
  }

  @OnEvent(TICKET_EVENTS.STATUS_CHANGED)
  async handleStatusChanged(
    event: TicketStatusNotificationEvent,
  ): Promise<void> {
    const recipientIds = this.getUniqueRecipients(
      event.recipientIds,
      event.actorId,
    );

    if (recipientIds.length === 0) {
      return;
    }

    this.logger.log(
      `Status notification event: ticket=${event.ticketId}, ` +
        `from=${event.fromStatus}, ` +
        `to=${event.toStatus}, ` +
        `recipients=${recipientIds.join(',')}`,
    );

    await this.sendNotificationEmails(recipientIds, event.actorId, {
      subject: `Ticket status changed: ${event.ticketId}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Ticket Status Changed</h2>
          <p>
            The status of ticket <strong>${event.ticketId}</strong> has changed.
          </p>
          <p>
            <strong>Previous status:</strong> ${event.fromStatus}<br />
            <strong>New status:</strong> ${event.toStatus}
          </p>
          <p>
            Open TechTicket to view the latest ticket details.
          </p>
        </div>
      `,
      text: [
        'Ticket Status Changed',
        '',
        `The status of ticket ${event.ticketId} has changed.`,
        '',
        `Previous status: ${event.fromStatus}`,
        `New status: ${event.toStatus}`,
        '',
        'Open TechTicket to view the latest ticket details.',
      ].join('\n'),
    });
  }

  @OnEvent(TICKET_EVENTS.COMMENT_ADDED)
  async handleCommentAdded(
    event: TicketCommentNotificationEvent,
  ): Promise<void> {
    await this.handleCommentNotification('added', event);
  }

  @OnEvent(TICKET_EVENTS.COMMENT_UPDATED)
  async handleCommentUpdated(
    event: TicketCommentNotificationEvent,
  ): Promise<void> {
    await this.handleCommentNotification('updated', event);
  }

  @OnEvent(TICKET_EVENTS.COMMENT_DELETED)
  async handleCommentDeleted(
    event: TicketCommentNotificationEvent,
  ): Promise<void> {
    await this.handleCommentNotification('deleted', event);
  }

  private async handleCommentNotification(
    action: 'added' | 'updated' | 'deleted',
    event: TicketCommentNotificationEvent,
  ): Promise<void> {
    const recipientIds = this.getUniqueRecipients(
      event.recipientIds,
      event.actorId,
    );

    if (recipientIds.length === 0) {
      return;
    }

    this.logger.log(
      `Comment ${action} notification event: ticket=${event.ticketId}, ` +
        `comment=${event.commentId}, ` +
        `type=${event.commentType}, ` +
        `recipients=${recipientIds.join(',')}`,
    );

    const actionLabel =
      action === 'added'
        ? 'New comment'
        : action === 'updated'
          ? 'Comment updated'
          : 'Comment deleted';

    await this.sendNotificationEmails(recipientIds, event.actorId, {
      subject: `${actionLabel}: ${event.ticketId}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>${actionLabel}</h2>
          <p>
            There has been a ${action} comment on ticket
            <strong>${event.ticketId}</strong>.
          </p>
          <p>
            <strong>Comment type:</strong> ${event.commentType}
          </p>
          <p>
            Open TechTicket to view the latest ticket details.
          </p>
        </div>
      `,
      text: [
        actionLabel,
        '',
        `There has been a ${action} comment on ticket ${event.ticketId}.`,
        '',
        `Comment type: ${event.commentType}`,
        '',
        'Open TechTicket to view the latest ticket details.',
      ].join('\n'),
    });
  }

  private getUniqueRecipients(
    recipientIds: string[],
    actorId: string,
  ): string[] {
    return [
      ...new Set(
        recipientIds.filter(
          (recipientId) => recipientId && recipientId !== actorId,
        ),
      ),
    ];
  }

  private async sendNotificationEmails(
    recipientIds: string[],
    actorId: string,
    email: {
      subject: string;
      html: string;
      text: string;
    },
  ): Promise<void> {
    const uniqueRecipientIds = this.getUniqueRecipients(recipientIds, actorId);

    if (uniqueRecipientIds.length === 0) {
      return;
    }

    await this.notificationQueueService.enqueueEmail({
      recipientIds: uniqueRecipientIds,
      actorId,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    this.logger.log(
      `Notification email queued: ` +
        `recipients=${uniqueRecipientIds.join(',')}, ` +
        `subject="${email.subject}"`,
    );
  }
}
