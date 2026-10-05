import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';

import { SlaDashboardController } from './sla-dashboard.controller';
import { SlaDashboardService } from './sla-dashboard.service';
import { SlaPolicyController } from './sla-policy.controller';
import { SlaPolicyService } from './sla-policy.service';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketRelationsService } from './ticket-relations.service';
import { SlaMonitorService } from './sla-monitor.service';
import { TicketActivityService } from './ticket-activity.service';
import { TicketActivityEventsService } from './ticket-activity-events.service';
import { TicketNotificationEventsService } from './ticket-notification-events.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, OrganizationContextModule, NotificationsModule],
  controllers: [TicketsController, SlaPolicyController, SlaDashboardController],
  providers: [
    TicketsService,
    TicketAttachmentsService,
    TicketRelationsService,
    SlaPolicyService,
    SlaMonitorService,
    SlaDashboardService,
    TicketActivityService,
    TicketActivityEventsService,
    TicketNotificationEventsService,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
