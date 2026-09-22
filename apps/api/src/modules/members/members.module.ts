import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';

import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [AuthModule, OrganizationContextModule],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
