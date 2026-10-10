import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsQueryService } from './analytics-query.service';
import { AnalyticsService } from './analytics.service';
import { EmployeeDashboardService } from './employee-dashboard.service';
import { TicketLibraryReportsService } from './ticket-library-reports.service';

@Module({
  imports: [AuthModule, OrganizationContextModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsQueryService,
    AnalyticsService,
    TicketLibraryReportsService,
    EmployeeDashboardService,
  ],
  exports: [AnalyticsQueryService, AnalyticsService, EmployeeDashboardService],
})
export class AnalyticsModule {}
