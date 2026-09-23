import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { expect } from 'vitest';

import {
  NOTIFICATION_JOBS,
  NOTIFICATION_QUEUE,
} from '../../src/modules/notifications/queues/notification-queue.constants.js';
import type { SendEmailNotificationJob } from '../../src/modules/notifications/queues/notification-job.types.js';

interface NotificationJobOptions {
  recipientId: string;
  subject?: string;
  excludeJobIds?: Set<string>;
  timeoutMs?: number;
  intervalMs?: number;
}

export function getNotificationQueue(
  app: INestApplication,
): Queue<SendEmailNotificationJob> {
  return app.get<Queue<SendEmailNotificationJob>>(
    getQueueToken(NOTIFICATION_QUEUE),
  );
}

export async function waitForEmailNotificationJob(
  queue: Queue<SendEmailNotificationJob>,
  options: NotificationJobOptions,
): Promise<Job<SendEmailNotificationJob>> {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const intervalMs = options.intervalMs ?? 100;

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const jobs = await queue.getJobs([
      'waiting',
      'active',
      'completed',
      'delayed',
      'failed',
    ]);

    const matchingJob = jobs.find(
      (job) =>
        job.name === NOTIFICATION_JOBS.SEND_EMAIL &&
        job.id !== undefined &&
        !options.excludeJobIds?.has(String(job.id)) &&
        job.data.recipientIds.includes(options.recipientId) &&
        (!options.subject || job.data.subject === options.subject),
    );

    if (matchingJob) {
      return matchingJob;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const jobs = await queue.getJobs([
    'waiting',
    'active',
    'completed',
    'delayed',
    'failed',
  ]);

  expect(
    jobs.map((job) => ({
      id: job.id,
      name: job.name,
      recipientIds: job.data.recipientIds,
      organizationId: job.data.organizationId,
    })),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        recipientIds: expect.arrayContaining([options.recipientId]),
      }),
    ]),
  );

  throw new Error(
    `Timed out waiting for notification job for recipient ${options.recipientId}`,
  );
}
