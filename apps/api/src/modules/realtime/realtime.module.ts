import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RealtimeEventsService } from './realtime-events.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeEventBroadcaster } from './realtime-event.broadcaster';
import { RealtimeApprovalEventsService } from './realtime-approval-events.service';
import { RealtimeTicketEventsService } from './realtime-ticket-events.service';
import { PermissionsModule } from '../../common/permissions/permissions.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { RealtimeSlaEventsService } from './realtime-sla-events.service';

@Module({
  imports: [
    AuthModule,
    OrganizationContextModule,
    TicketsModule,
    PermissionsModule,
    ApprovalsModule,
  ],
  providers: [
    RealtimeService,
    RealtimeGateway,
    RealtimeEventsService,
    RealtimeEventBroadcaster,
    RealtimeTicketEventsService,
    RealtimeApprovalEventsService,
    RealtimeSlaEventsService,
  ],
  exports: [RealtimeService, RealtimeEventsService, RealtimeEventBroadcaster],
})
export class RealtimeModule {}
