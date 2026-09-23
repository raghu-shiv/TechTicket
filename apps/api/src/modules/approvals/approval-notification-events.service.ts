import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { NotificationQueueService } from '../notifications/queues/notification-queue.service';

import { APPROVAL_EVENTS, ApprovalActivityEvent } from './approval-events';

@Injectable()
export class ApprovalNotificationEventsService {
  private readonly logger = new Logger(ApprovalNotificationEventsService.name);

  constructor(
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  @OnEvent(APPROVAL_EVENTS.REQUESTED)
  async handleRequested(event: ApprovalActivityEvent): Promise<void> {
    await this.sendNotification(event, event.approverId, {
      subject: `Approval requested: ${event.ticketNumber}`,
      heading: 'Approval Requested',
      message: `An approval has been requested for ticket ${event.ticketNumber}.`,
    });
  }

  @OnEvent(APPROVAL_EVENTS.APPROVED)
  async handleApproved(event: ApprovalActivityEvent): Promise<void> {
    await this.sendNotification(event, event.requesterId, {
      subject: `Approval approved: ${event.ticketNumber}`,
      heading: 'Approval Approved',
      message: `The approval request for ticket ${event.ticketNumber} has been approved.`,
    });
  }

  @OnEvent(APPROVAL_EVENTS.REJECTED)
  async handleRejected(event: ApprovalActivityEvent): Promise<void> {
    await this.sendNotification(event, event.requesterId, {
      subject: `Approval rejected: ${event.ticketNumber}`,
      heading: 'Approval Rejected',
      message: `The approval request for ticket ${event.ticketNumber} has been rejected.`,
    });
  }

  @OnEvent(APPROVAL_EVENTS.CANCELLED)
  async handleCancelled(event: ApprovalActivityEvent): Promise<void> {
    await this.sendNotification(event, event.approverId, {
      subject: `Approval cancelled: ${event.ticketNumber}`,
      heading: 'Approval Cancelled',
      message: `The approval request for ticket ${event.ticketNumber} has been cancelled.`,
    });
  }

  private async sendNotification(
    event: ApprovalActivityEvent,
    recipientId: string,
    email: {
      subject: string;
      heading: string;
      message: string;
    },
  ): Promise<void> {
    if (!recipientId) {
      return;
    }

    await this.notificationQueueService.enqueueEmail({
      recipientIds: [recipientId],
      actorId: event.actorId,
      organizationId: event.organizationId,
      subject: email.subject,
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>${email.heading}</h2>

      <p>
        ${email.message}
      </p>

      <p>
        <strong>Ticket:</strong> ${event.ticketNumber}
      </p>

      ${
        event.comment
          ? `
            <p>
              <strong>Comment:</strong> ${event.comment}
            </p>
          `
          : ''
      }

      <p>
        Open TechTicket to view the latest ticket details.
      </p>
    </div>
  `,
      text: [
        email.heading,
        '',
        email.message,
        '',
        `Ticket: ${event.ticketNumber}`,
        ...(event.comment ? ['', `Comment: ${event.comment}`] : []),
        '',
        'Open TechTicket to view the latest ticket details.',
      ].join('\n'),
    });

    this.logger.log(
      `Approval notification queued: ` +
        `event=${event.status}, ` +
        `ticket=${event.ticketNumber}, ` +
        `recipient=${recipientId}`,
    );
  }
}
