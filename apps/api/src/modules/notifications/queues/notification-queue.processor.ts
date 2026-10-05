import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import {
  NOTIFICATION_JOBS,
  NOTIFICATION_QUEUE,
} from './notification-queue.constants';
import { SendEmailNotificationJob } from './notification-job.types';
import { NotificationProcessorService } from './notification-processor.service';

@Processor(NOTIFICATION_QUEUE)
@Injectable()
export class NotificationQueueProcessor extends WorkerHost {
  constructor(
    private readonly notificationProcessor: NotificationProcessorService,
  ) {
    super();
  }

  async process(
    job: Job<SendEmailNotificationJob, unknown, string>,
  ): Promise<void> {
    switch (job.name) {
      case NOTIFICATION_JOBS.SEND_EMAIL:
        await this.notificationProcessor.process(job);
        return;

      default:
        throw new Error(`Unsupported notification job: ${job.name}`);
    }
  }
}
