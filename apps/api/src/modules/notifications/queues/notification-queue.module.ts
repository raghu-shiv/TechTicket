import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { NOTIFICATION_QUEUE } from './notification-queue.constants';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { NotificationQueueService } from './notification-queue.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
  ],
  providers: [NotificationQueueService, NotificationQueueProcessor],
  exports: [NotificationQueueService],
})
export class NotificationQueueModule {}
