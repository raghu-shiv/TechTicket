import type { INestApplication } from '@nestjs/common';
import type { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import { createOrganizationTestFixture } from './helpers/organization.helper.js';

import { DatabaseService } from '../src/database/database.service.js';
import { EmailService } from '../src/modules/notifications/email/email.service.js';
import { NotificationQueueProcessor } from '../src/modules/notifications/queues/notification-queue.processor.js';
import { NOTIFICATION_JOBS } from '../src/modules/notifications/queues/notification-queue.constants.js';
import type { SendEmailNotificationJob } from '../src/modules/notifications/queues/notification-job.types.js';

describe('Notification Organization Isolation (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let processor: NotificationQueueProcessor;

  let organizationA: Awaited<ReturnType<typeof createOrganizationTestFixture>>;

  let organizationB: Awaited<ReturnType<typeof createOrganizationTestFixture>>;

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);
    processor = app.get(NotificationQueueProcessor);

    organizationA = await createOrganizationTestFixture(app);
    organizationB = await createOrganizationTestFixture(app);
  });

  afterAll(async () => {
    await app.close();
  });

  function createJob(
    organizationId: string,
    recipientIds: string[],
  ): Job<SendEmailNotificationJob> {
    return {
      id: `test-isolation-job-${randomUUID()}`,
      name: NOTIFICATION_JOBS.SEND_EMAIL,
      data: {
        recipientIds,
        actorId: organizationA.admin.userId,
        organizationId,
        subject: 'Organization isolation test',
        html: '<p>Organization isolation test</p>',
        text: 'Organization isolation test',
      },
    } as Job<SendEmailNotificationJob>;
  }

  it('should not send notifications to users from another organization', async () => {
    const sendMock = vi
      .spyOn(app.get(EmailService), 'send')
      .mockResolvedValue(undefined);

    const job = createJob(organizationA.organization.id, [
      organizationB.admin.userId,
    ]);

    await expect(processor.process(job)).rejects.toThrow(
      `Notification job ${job.id} has no valid recipient email addresses within organization ${organizationA.organization.id}`,
    );

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('should send notifications only to recipients belonging to the job organization', async () => {
    const sendMock = vi
      .spyOn(app.get(EmailService), 'send')
      .mockResolvedValue(undefined);

    const job = createJob(organizationA.organization.id, [
      organizationA.admin.userId,
      organizationB.admin.userId,
    ]);

    await processor.process(job);

    expect(sendMock).toHaveBeenCalledOnce();

    expect(sendMock).toHaveBeenCalledWith({
      to: [organizationA.admin.email],
      subject: 'Organization isolation test',
      html: '<p>Organization isolation test</p>',
      text: 'Organization isolation test',
    });
  });

  it('should preserve isolation when a user belongs to multiple organizations', async () => {
    await database.membership.create({
      data: {
        userId: organizationB.admin.userId,
        organizationId: organizationA.organization.id,
        role: 'REQUESTER',
      },
    });

    const sendMock = vi
      .spyOn(app.get(EmailService), 'send')
      .mockResolvedValue(undefined);

    const job = createJob(organizationB.organization.id, [
      organizationB.admin.userId,
    ]);

    await processor.process(job);

    expect(sendMock).toHaveBeenCalledOnce();

    expect(sendMock).toHaveBeenCalledWith({
      to: [organizationB.admin.email],
      subject: 'Organization isolation test',
      html: '<p>Organization isolation test</p>',
      text: 'Organization isolation test',
    });
  });
});
