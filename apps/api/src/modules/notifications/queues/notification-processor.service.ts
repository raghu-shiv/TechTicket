import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { DatabaseService } from '../../../database/database.service';
import { EmailService } from '../email/email.service';

import { NOTIFICATION_JOBS } from './notification-queue.constants';
import { SendEmailNotificationJob } from './notification-job.types';

@Injectable()
export class NotificationProcessorService {
  private readonly logger = new Logger(NotificationProcessorService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly emailService: EmailService,
  ) {}

  async process(
    job: Job<SendEmailNotificationJob, unknown, string>,
  ): Promise<void> {
    switch (job.name) {
      case NOTIFICATION_JOBS.SEND_EMAIL:
        await this.processSendEmail(job);
        return;

      default:
        throw new Error(`Unsupported notification job: ${job.name}`);
    }
  }

  private async processSendEmail(
    job: Job<SendEmailNotificationJob>,
  ): Promise<void> {
    const { recipientIds, organizationId, subject, html, text } = job.data;

    const recipients = await this.database.user.findMany({
      where: {
        id: {
          in: recipientIds,
        },
        memberships: {
          some: {
            organizationId,
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const emailAddresses = recipients
      .map((recipient) => recipient.email)
      .filter((email): email is string => Boolean(email));

    const missingRecipientIds = recipientIds.filter(
      (recipientId) =>
        !recipients.some((recipient) => recipient.id === recipientId),
    );

    if (missingRecipientIds.length > 0) {
      this.logger.warn(
        `Notification job ${job.id} contains missing or out-of-organization recipients: ` +
          `${missingRecipientIds.join(', ')}`,
      );
    }

    if (emailAddresses.length === 0) {
      throw new Error(
        `Notification job ${job.id} has no valid recipient email addresses ` +
          `within organization ${organizationId}`,
      );
    }

    await this.emailService.send({
      to: emailAddresses,
      subject,
      html,
      text,
    });
  }
}
