import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';

import { OrganizationContextParam } from '../../common/organization/organization-context.decorator';
import { OrganizationGuard } from '../../common/organization/organization.guard';
import { OrganizationRoles } from '../../common/organization/organization-role.decorator';
import { OrganizationRoleGuard } from '../../common/organization/organization-role.guard';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ListMembersQueryDto } from './dto/list-members-query.dto';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(AuthGuard, OrganizationGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async getMembers(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Query() query: ListMembersQueryDto,
  ) {
    if (query.search !== undefined) {
      return this.membersService.searchMembers(
        context,
        query.search,
        query.limit ?? 8,
      );
    }
    return this.membersService.findAll(context);
  }

  @Post()
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async addMember(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Body() dto: AddMemberDto,
  ) {
    return this.membersService.addMember(context, dto.email, dto.role);
  }

  @Patch(':userId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async updateMemberRole(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateRole(context, userId, dto.role);
  }

  @Delete(':userId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async removeMember(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('userId') userId: string,
  ) {
    return this.membersService.removeMember(context, userId);
  }
}
