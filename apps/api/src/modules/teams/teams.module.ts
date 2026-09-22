import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';

import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [AuthModule, OrganizationContextModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
