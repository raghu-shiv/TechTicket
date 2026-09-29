import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RealtimeEventsService } from './realtime-events.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeEventBroadcaster } from './realtime-event.broadcaster';
import { RealtimeTicketEventsService } from './realtime-ticket-events.service';

@Module({
  imports: [AuthModule, OrganizationContextModule, TicketsModule],
  providers: [
    RealtimeService,
    RealtimeGateway,
    RealtimeEventsService,
    RealtimeEventBroadcaster,
    RealtimeTicketEventsService,
  ],
  exports: [RealtimeService, RealtimeEventsService, RealtimeEventBroadcaster],
})
export class RealtimeModule {}
