import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';

import { EmailModule } from './email/email.module';
import { NotificationInboxEventsService } from './notification-inbox-events.service';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';
import { NotificationQueueModule } from './queues/notification-queue.module';

@Module({
  imports: [
    AuthModule,
    OrganizationContextModule,
    EmailModule,
    NotificationQueueModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationService, NotificationInboxEventsService],
  exports: [EmailModule, NotificationQueueModule, NotificationService],
})
export class NotificationsModule {}
