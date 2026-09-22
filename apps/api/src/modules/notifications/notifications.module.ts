import { Module } from '@nestjs/common';

import { EmailModule } from './email/email.module';
import { NotificationQueueModule } from './queues/notification-queue.module';

@Module({
  imports: [EmailModule, NotificationQueueModule],
  exports: [EmailModule, NotificationQueueModule],
})
export class NotificationsModule {}
