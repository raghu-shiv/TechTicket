import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';

import { TicketLibraryController } from './ticket-library.controller';
import { TicketLibraryService } from './ticket-library.service';

@Module({
  imports: [AuthModule, OrganizationContextModule],
  controllers: [TicketLibraryController],
  providers: [TicketLibraryService],
  exports: [TicketLibraryService],
})
export class TicketLibraryModule {}
