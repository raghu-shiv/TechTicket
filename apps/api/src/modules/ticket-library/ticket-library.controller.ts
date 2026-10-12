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

import { CreateTicketLibraryEntryDto } from './dto/create-ticket-library-entry.dto';
import { ListTicketLibraryEntriesDto } from './dto/list-ticket-library-entries.dto';
import { UpdateTicketLibraryEntryDto } from './dto/update-ticket-library-entry.dto';
import { TicketLibraryService } from './ticket-library.service';

@Controller('ticket-library')
@UseGuards(AuthGuard, OrganizationGuard)
export class TicketLibraryController {
  constructor(private readonly ticketLibraryService: TicketLibraryService) {}

  @Get()
  async findAll(
    @OrganizationContextParam() context: OrganizationContext,
    @Query() query: ListTicketLibraryEntriesDto,
  ) {
    return this.ticketLibraryService.findAll(context, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      productId: query.productId,
    });
  }

  @Post()
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN', 'AGENT')
  async create(
    @OrganizationContextParam() context: OrganizationContext,
    @Body() dto: CreateTicketLibraryEntryDto,
  ) {
    return this.ticketLibraryService.create(context, dto);
  }

  @Get(':entryId')
  async findOne(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('entryId') entryId: string,
  ) {
    return this.ticketLibraryService.findOne(context, entryId);
  }

  @Patch(':entryId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN', 'AGENT')
  async update(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateTicketLibraryEntryDto,
  ) {
    return this.ticketLibraryService.update(context, entryId, dto);
  }

  @Delete(':entryId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async remove(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('entryId') entryId: string,
  ) {
    return this.ticketLibraryService.remove(context, entryId);
  }
}
