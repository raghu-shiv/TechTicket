import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';
import { PermissionsModule } from '../../common/permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { ApprovalActivityEventsService } from './approval-activity-events.service';
import { ApprovalNotificationEventsService } from './approval-notification-events.service';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [
    AuthModule,
    OrganizationContextModule,
    PermissionsModule,
    NotificationsModule,
  ],
  controllers: [ApprovalsController],
  providers: [
    ApprovalsService,
    ApprovalActivityEventsService,
    ApprovalNotificationEventsService,
  ],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
