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

import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(AuthGuard, OrganizationGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async getTeams(@OrganizationContextParam() context: OrganizationContext) {
    return this.teamsService.findAll(context);
  }

  @Get(':teamId')
  async getTeam(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.findOne(context, teamId);
  }

  @Post()
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async createTeam(
    @OrganizationContextParam() context: OrganizationContext,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.create(context, dto.name, dto.description);
  }

  @Patch(':teamId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async updateTeam(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(context, teamId, {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    });
  }

  @Delete(':teamId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async deleteTeam(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.remove(context, teamId);
  }

  @Post(':teamId/members/:userId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async addTeamMember(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.teamsService.addMember(context, teamId, userId);
  }

  @Delete(':teamId/members/:userId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async removeTeamMember(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.teamsService.removeMember(context, teamId, userId);
  }
}
