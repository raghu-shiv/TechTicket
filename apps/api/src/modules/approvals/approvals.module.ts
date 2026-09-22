import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';
import { PermissionsModule } from '../../common/permissions/permissions.module';

import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { ApprovalActivityEventsService } from './approval-activity-events.service';

@Module({
  imports: [AuthModule, OrganizationContextModule, PermissionsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalActivityEventsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
