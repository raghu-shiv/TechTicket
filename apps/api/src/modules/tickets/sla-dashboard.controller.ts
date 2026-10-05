import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { OrganizationContextParam } from '../../common/organization/organization-context.decorator';
import { OrganizationGuard } from '../../common/organization/organization.guard';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { SlaDashboardQueryDto } from './dto/sla/sla-dashboard-query.dto';

import { SlaDashboardService } from './sla-dashboard.service';

@Controller('reports/sla')
@UseGuards(AuthGuard, OrganizationGuard)
export class SlaDashboardController {
  constructor(private readonly slaDashboardService: SlaDashboardService) {}

  @Get('dashboard')
  async getDashboard(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Query() query: SlaDashboardQueryDto,
  ) {
    return this.slaDashboardService.getDashboard(context, {
      view: query.view,
      page: query.page,
      limit: query.limit,
      priority: query.priority as never,
      teamId: query.teamId,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
    });
  }
}
