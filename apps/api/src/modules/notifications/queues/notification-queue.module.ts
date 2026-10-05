import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { NOTIFICATION_QUEUE } from './notification-queue.constants';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationProcessorService } from './notification-processor.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
  ],
  providers: [
    NotificationQueueService,
    NotificationProcessorService,
    ...(process.env.TECHTICKET_E2E === 'true'
      ? []
      : [NotificationQueueProcessor]),
  ],
  exports: [NotificationQueueService, NotificationProcessorService],
})
export class NotificationQueueModule {}
