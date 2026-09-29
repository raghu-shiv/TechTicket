import { Module } from '@nestjs/common';

import { EmailModule } from './email/email.module';
import { NotificationQueueModule } from './queues/notification-queue.module';
import { NotificationService } from './notification.service';

@Module({
  imports: [EmailModule, NotificationQueueModule],
  providers: [NotificationService],
  exports: [EmailModule, NotificationQueueModule, NotificationService],
})
export class NotificationsModule {}
