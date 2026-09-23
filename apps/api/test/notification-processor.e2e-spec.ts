import type { INestApplication } from '@nestjs/common';
import type { Job } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

import { createTestApp } from './helpers/app.helper.js';
import { createOrganizationTestFixture } from './helpers/organization.helper.js';

import { DatabaseService } from '../src/database/database.service.js';
import { EmailService } from '../src/modules/notifications/email/email.service.js';
import { NotificationQueueProcessor } from '../src/modules/notifications/queues/notification-queue.processor.js';
import { NOTIFICATION_JOBS } from '../src/modules/notifications/queues/notification-queue.constants.js';
import type { SendEmailNotificationJob } from '../src/modules/notifications/queues/notification-job.types.js';

describe('Notification Queue Processor (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let processor: NotificationQueueProcessor;
  let emailService: EmailService;
  let fixture: Awaited<ReturnType<typeof createOrganizationTestFixture>>;

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);
    processor = app.get(NotificationQueueProcessor);
    emailService = app.get(EmailService);

    fixture = await createOrganizationTestFixture(app);
  });

  afterAll(async () => {
    await app.close();
  });

  function createJob(
    data: Partial<SendEmailNotificationJob>,
    name = NOTIFICATION_JOBS.SEND_EMAIL,
  ): Job<SendEmailNotificationJob> {
    return {
      id: 'test-notification-job',
      name,
      data: {
        recipientIds: [fixture.owner.userId],
        actorId: fixture.admin.userId,
        organizationId: fixture.organization.id,
        subject: 'Test notification',
        html: '<p>Test notification</p>',
        text: 'Test notification',
        ...data,
      },
    } as Job<SendEmailNotificationJob>;
  }

  it('should send an email to a valid recipient in the organization', async () => {
    const sendMock = vi
      .spyOn(emailService, 'send')
      .mockResolvedValue(undefined);

    const job = createJob({
      recipientIds: [fixture.owner.userId],
      subject: 'Processor integration test',
      html: '<p>Hello owner</p>',
      text: 'Hello owner',
    });

    await processor.process(job);

    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock).toHaveBeenCalledWith({
      to: [fixture.owner.email],
      subject: 'Processor integration test',
      html: '<p>Hello owner</p>',
      text: 'Hello owner',
    });
  });

  it('should not send an email to a recipient outside the organization', async () => {
    const outsideUser = await database.user.create({
      data: {
        id: randomUUID(),
        name: 'Outside Organization User',
        email: `outside-${randomUUID()}@example.com`,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const sendMock = vi
      .spyOn(emailService, 'send')
      .mockResolvedValue(undefined);

    const job = createJob({
      recipientIds: [outsideUser.id],
    });

    await expect(processor.process(job)).rejects.toThrow(
      `Notification job ${job.id} has no valid recipient email addresses within organization ${fixture.organization.id}`,
    );

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('should reject a notification when all recipient IDs are invalid', async () => {
    const sendMock = vi
      .spyOn(emailService, 'send')
      .mockResolvedValue(undefined);

    const missingRecipientId = randomUUID();

    const job = createJob({
      recipientIds: [missingRecipientId],
    });

    await expect(processor.process(job)).rejects.toThrow(
      `Notification job ${job.id} has no valid recipient email addresses within organization ${fixture.organization.id}`,
    );

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('should reject an unsupported notification job', async () => {
    const job = createJob({}, 'unsupported-job');

    await expect(processor.process(job)).rejects.toThrow(
      'Unsupported notification job: unsupported-job',
    );
  });
});
