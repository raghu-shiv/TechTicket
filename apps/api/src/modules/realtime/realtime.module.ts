import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { RealtimeEventsService } from './realtime-events.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [AuthModule],
  providers: [RealtimeService, RealtimeGateway, RealtimeEventsService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
