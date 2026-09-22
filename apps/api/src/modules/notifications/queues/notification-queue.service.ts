import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import {
  NOTIFICATION_JOBS,
  NOTIFICATION_QUEUE,
} from './notification-queue.constants';
import { SendEmailNotificationJob } from './notification-job.types';

@Injectable()
export class NotificationQueueService {
  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  async enqueueEmail(job: SendEmailNotificationJob): Promise<void> {
    await this.notificationQueue.add(NOTIFICATION_JOBS.SEND_EMAIL, job, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
