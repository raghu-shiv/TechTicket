import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

import type { SavedFilterDefinition } from './saved-filter.types';
import { normalizeSavedFilter } from './saved-filter.utils';

interface CreateSavedFilterInput {
  name: string;
  description?: string;
  filters: SavedFilterDefinition;
}

interface UpdateSavedFilterInput {
  name?: string;
  description?: string;
  filters?: SavedFilterDefinition;
}

@Injectable()
export class SavedFilterService {
  constructor(private readonly database: DatabaseService) {}

  async create(context: OrganizationContext, input: CreateSavedFilterInput) {
    const name = this.normalizeName(input.name);

    const description = this.normalizeDescription(input.description);

    const filters = normalizeSavedFilter(input.filters);

    const savedFilter = await this.database.savedFilter.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        name,
        description,
        filters: filters as Prisma.InputJsonValue,
      },
    });

    return this.toResponse(savedFilter);
  }

  async findAll(context: OrganizationContext) {
    const savedFilters = await this.database.savedFilter.findMany({
      where: {
        organizationId: context.organizationId,
        userId: context.userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return {
      items: savedFilters.map((savedFilter) => this.toResponse(savedFilter)),
    };
  }

  async findOne(context: OrganizationContext, savedFilterId: string) {
    const savedFilter = await this.database.savedFilter.findFirst({
      where: {
        id: savedFilterId,
        organizationId: context.organizationId,
        userId: context.userId,
      },
    });

    if (!savedFilter) {
      throw new NotFoundException('Saved filter not found');
    }

    return this.toResponse(savedFilter);
  }

  async update(
    context: OrganizationContext,
    savedFilterId: string,
    input: UpdateSavedFilterInput,
  ) {
    const existing = await this.database.savedFilter.findFirst({
      where: {
        id: savedFilterId,
        organizationId: context.organizationId,
        userId: context.userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Saved filter not found');
    }

    const data: Prisma.SavedFilterUpdateInput = {};

    if (input.name !== undefined) {
      data.name = this.normalizeName(input.name);
    }

    if (input.description !== undefined) {
      data.description = this.normalizeDescription(input.description);
    }

    if (input.filters !== undefined) {
      const filters = normalizeSavedFilter(input.filters);

      data.filters = filters as Prisma.InputJsonValue;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const savedFilter = await this.database.savedFilter.update({
      where: {
        id: existing.id,
      },
      data,
    });

    return this.toResponse(savedFilter);
  }

  async remove(context: OrganizationContext, savedFilterId: string) {
    const existing = await this.database.savedFilter.findFirst({
      where: {
        id: savedFilterId,
        organizationId: context.organizationId,
        userId: context.userId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Saved filter not found');
    }

    await this.database.savedFilter.delete({
      where: {
        id: existing.id,
      },
    });

    return {
      success: true,
      savedFilterId: existing.id,
    };
  }

  private normalizeName(name: string): string {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Saved filter name is required');
    }

    return normalizedName;
  }

  private normalizeDescription(description: string | undefined): string | null {
    if (description === undefined) {
      return null;
    }

    const normalizedDescription = description.trim();

    return normalizedDescription || null;
  }

  private toResponse(savedFilter: {
    id: string;
    organizationId: string;
    userId: string;
    name: string;
    description: string | null;
    filters: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: savedFilter.id,
      organizationId: savedFilter.organizationId,
      userId: savedFilter.userId,
      name: savedFilter.name,
      description: savedFilter.description,
      filters: savedFilter.filters,
      createdAt: savedFilter.createdAt.toISOString(),
      updatedAt: savedFilter.updatedAt.toISOString(),
    };
  }
}
