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

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(AuthGuard, OrganizationGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @OrganizationContextParam()
    context: OrganizationContext,
  ) {
    return this.productsService.findAll(context);
  }

  @Get(':productId')
  async findOne(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('productId') productId: string,
  ) {
    return this.productsService.findOne(context, productId);
  }

  @Post()
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async create(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(context, {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    });
  }

  @Patch(':productId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async update(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(context, productId, {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    });
  }

  @Delete(':productId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async remove(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('productId') productId: string,
  ) {
    return this.productsService.remove(context, productId);
  }
}
