import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';

import { OrganizationContextParam } from '../../common/organization/organization-context.decorator';

import { OrganizationGuard } from '../../common/organization/organization.guard';

import type { OrganizationContext } from '../../common/organization/organization.types';

import { AnalyticsQueryDto } from './dto/analytics-query.dto';

import { AnalyticsService } from './analytics.service';

@Controller('reports/analytics')
@UseGuards(AuthGuard, OrganizationGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard(
    @OrganizationContextParam()
    context: OrganizationContext,

    @Query()
    query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getDashboard(context, query);
  }

  @Get('foundation')
  getFoundation(
    @OrganizationContextParam()
    context: OrganizationContext,

    @Query()
    query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getFoundation(context, query);
  }
}
