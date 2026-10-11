import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';
import { AuthGuard } from '../../common/auth/auth.guard';
import { OrganizationContextParam } from '../../common/organization/organization-context.decorator';
import { OrganizationGuard } from '../../common/organization/organization.guard';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { EmployeeDashboardQueryDto } from './dto/employee-dashboard-query.dto';
import { TatReportQueryDto } from './dto/tat-report-query.dto';
import { TicketLibraryReportQueryDto } from './dto/ticket-library-report-query.dto';
import { AnalyticsService } from './analytics.service';
import { AnalyticsExportService } from './analytics-export.service';
import { EmployeeDashboardService } from './employee-dashboard.service';
import { TicketLibraryReportsService } from './ticket-library-reports.service';
import { UsageReportQueryDto } from './dto/usage-report-query.dto';
import { UsageReportService } from './usage-report.service';

@Controller('reports/analytics')
@UseGuards(AuthGuard, OrganizationGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly ticketLibraryReportsService: TicketLibraryReportsService,
    private readonly employeeDashboardService: EmployeeDashboardService,
    private readonly usageReportService: UsageReportService,
    private readonly analyticsExportService: AnalyticsExportService,
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

  @Get('usage')
  getUsageReport(
    @OrganizationContextParam() context: OrganizationContext,
    @Query() query: UsageReportQueryDto,
  ) {
    return this.usageReportService.getReport(context, query);
  }

  @Get('export/:report')
  async exportReport(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('report') report: string,
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const result = await this.analyticsExportService.createExport(
      context,
      report,
      query,
    );

    response.setHeader('Content-Type', result.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    return new StreamableFile(result.stream);
  }
}
