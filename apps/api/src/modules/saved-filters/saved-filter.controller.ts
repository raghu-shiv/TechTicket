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

import { OrganizationGuard } from './../../common/organization/organization.guard';
import { AuthGuard } from './../../common/auth/auth.guard';
import { OrganizationContextParam } from './../../common/organization/organization-context.decorator';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';
import { SavedFilterService } from './saved-filter.service';

@Controller('saved-filters')
@UseGuards(AuthGuard, OrganizationGuard)
export class SavedFilterController {
  constructor(private readonly savedFilterService: SavedFilterService) {}

  @Post()
  create(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Body() dto: CreateSavedFilterDto,
  ) {
    return this.savedFilterService.create(context, {
      name: dto.name,
      description: dto.description,
      filters: dto.filters,
    });
  }

  @Get()
  findAll(
    @OrganizationContextParam()
    context: OrganizationContext,
  ) {
    return this.savedFilterService.findAll(context);
  }

  @Get(':id')
  findOne(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('id') id: string,
  ) {
    return this.savedFilterService.findOne(context, id);
  }

  @Patch(':id')
  update(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('id') id: string,
    @Body() dto: UpdateSavedFilterDto,
  ) {
    return this.savedFilterService.update(context, id, {
      name: dto.name,
      description: dto.description,
      filters: dto.filters,
    });
  }

  @Delete(':id')
  remove(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('id') id: string,
  ) {
    return this.savedFilterService.remove(context, id);
  }
}
