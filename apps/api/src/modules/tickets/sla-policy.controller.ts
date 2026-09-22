import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { OrganizationContextParam } from '../../common/organization/organization-context.decorator';
import { OrganizationGuard } from '../../common/organization/organization.guard';
import { OrganizationRoles } from '../../common/organization/organization-role.decorator';
import { OrganizationRoleGuard } from '../../common/organization/organization-role.guard';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { CreateSlaPolicyDto } from './dto/sla/create-sla-policy.dto';
import { UpdateSlaPolicyDto } from './dto/sla/update-sla-policy.dto';
import { SlaPolicyService } from './sla-policy.service';

@Controller('sla-policies')
@UseGuards(AuthGuard, OrganizationGuard)
export class SlaPolicyController {
  constructor(private readonly slaPolicyService: SlaPolicyService) {}

  @Get()
  async getPolicies(@OrganizationContextParam() context: OrganizationContext) {
    return this.slaPolicyService.findAll(context);
  }

  @Get(':policyId')
  async getPolicy(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('policyId') policyId: string,
  ) {
    return this.slaPolicyService.findOne(context, policyId);
  }

  @Post()
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async createPolicy(
    @OrganizationContextParam() context: OrganizationContext,
    @Body() dto: CreateSlaPolicyDto,
  ) {
    return this.slaPolicyService.create(context, dto);
  }

  @Patch(':policyId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async updatePolicy(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('policyId') policyId: string,
    @Body() dto: UpdateSlaPolicyDto,
  ) {
    return this.slaPolicyService.update(context, policyId, dto);
  }

  @Post(':policyId/activate')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async activatePolicy(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('policyId') policyId: string,
  ) {
    return this.slaPolicyService.activate(context, policyId);
  }

  @Post(':policyId/deactivate')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async deactivatePolicy(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('policyId') policyId: string,
  ) {
    return this.slaPolicyService.deactivate(context, policyId);
  }

  @Delete(':policyId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async deletePolicy(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('policyId') policyId: string,
  ) {
    return this.slaPolicyService.remove(context, policyId);
  }
}
