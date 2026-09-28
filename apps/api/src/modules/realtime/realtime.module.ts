import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [AuthModule, OrganizationContextModule, TicketsModule],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
