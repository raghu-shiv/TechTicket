import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/auth/auth.types';

import { OrganizationContextParam } from '../../common/organization/organization-context.decorator';
import { OrganizationGuard } from '../../common/organization/organization.guard';
import { OrganizationRoles } from '../../common/organization/organization-role.decorator';
import { OrganizationRoleGuard } from '../../common/organization/organization-role.guard';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async getOrganizations(@CurrentUser() user: CurrentUserType) {
    return this.organizationsService.findByUserId(user.id);
  }

  @Post()
  async createOrganization(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.createForUser(user.id, dto);
  }

  @Get('context')
  @UseGuards(OrganizationGuard)
  async getCurrentOrganization(
    @OrganizationContextParam()
    context: OrganizationContext,
  ) {
    return context;
  }

  @Get('admin-test')
  @UseGuards(OrganizationGuard, OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async adminTest(
    @OrganizationContextParam()
    context: OrganizationContext,
  ) {
    return {
      message: 'Organization admin authorization successful',
      organizationId: context.organizationId,
      userId: context.userId,
      role: context.role,
    };
  }
}
