import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { OrganizationContextParam } from '../../common/organization/organization-context.decorator';
import { OrganizationGuard } from '../../common/organization/organization.guard';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { EmployeeDashboardQueryDto } from './dto/employee-dashboard-query.dto';
import { TatReportQueryDto } from './dto/tat-report-query.dto';
import { TicketLibraryReportQueryDto } from './dto/ticket-library-report-query.dto';
import { AnalyticsService } from './analytics.service';
import { EmployeeDashboardService } from './employee-dashboard.service';
import { TicketLibraryReportsService } from './ticket-library-reports.service';

@Controller('reports/analytics')
@UseGuards(AuthGuard, OrganizationGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly ticketLibraryReportsService: TicketLibraryReportsService,
    private readonly employeeDashboardService: EmployeeDashboardService,
  ) {}

  @Get('dashboard')
  getDashboard(
    @OrganizationContextParam() context: OrganizationContext,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getDashboard(context, query);
  }

  @Get('foundation')
  getFoundation(
    @OrganizationContextParam() context: OrganizationContext,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getFoundation(context, query);
  }

  @Get('products')
  getProductAnalytics(
    @OrganizationContextParam() context: OrganizationContext,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getProductAnalytics(context, query);
  }

  @Get('sla')
  getSlaReport(
    @OrganizationContextParam() context: OrganizationContext,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getSlaReport(context, query);
  }

  @Get('tat')
  getTatReport(
    @OrganizationContextParam() context: OrganizationContext,
    @Query() query: TatReportQueryDto,
  ) {
    return this.analyticsService.getTatReport(context, query);
  }

  @Get('ticket-library')
  getTicketLibraryReport(
    @OrganizationContextParam() context: OrganizationContext,
    @Query() query: TicketLibraryReportQueryDto,
  ) {
    return this.ticketLibraryReportsService.getReport(context, query);
  }

  @Get('employees')
  getEmployeeDashboard(
    @OrganizationContextParam() context: OrganizationContext,
    @Query() query: EmployeeDashboardQueryDto,
  ) {
    return this.employeeDashboardService.getDashboard(context, query);
  }
}
