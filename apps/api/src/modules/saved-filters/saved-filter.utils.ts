import { BadRequestException } from '@nestjs/common';

import type { SavedFilterDefinition } from './saved-filter.types';

export function normalizeSavedFilter(
  filters: SavedFilterDefinition,
): SavedFilterDefinition {
  const normalized: SavedFilterDefinition = {
    search: filters.search?.trim() || undefined,

    status: filters.status,
    priority: filters.priority,
    type: filters.type,

    assigneeId: filters.assigneeId?.trim() || undefined,
    teamId: filters.teamId?.trim() || undefined,
    requesterId: filters.requesterId?.trim() || undefined,

    productId: filters.productId?.trim() || undefined,

    unassigned: filters.unassigned,
    unassignedTeam: filters.unassignedTeam,
    slaBreached: filters.slaBreached,

    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,

    updatedFrom: filters.updatedFrom,
    updatedTo: filters.updatedTo,

    sortBy: filters.sortBy ?? 'updatedAt',
    sortOrder: filters.sortOrder ?? 'desc',

    limit: filters.limit ?? 20,
  };

  validateSavedFilterRanges(normalized);

  if (
    normalized.assigneeId !== undefined &&
    normalized.unassigned !== undefined
  ) {
    throw new BadRequestException('assigneeId cannot be used with unassigned');
  }

  if (
    normalized.teamId !== undefined &&
    normalized.unassignedTeam !== undefined
  ) {
    throw new BadRequestException('teamId cannot be used with unassignedTeam');
  }

  return normalized;
}

function validateSavedFilterRanges(filters: SavedFilterDefinition): void {
  const createdFrom = parseDate(filters.createdFrom);
  const createdTo = parseDate(filters.createdTo);

  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw new BadRequestException('createdFrom cannot be later than createdTo');
  }

  const updatedFrom = parseDate(filters.updatedFrom);
  const updatedTo = parseDate(filters.updatedTo);

  if (updatedFrom && updatedTo && updatedFrom > updatedTo) {
    throw new BadRequestException('updatedFrom cannot be later than updatedTo');
  }
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid date value: ${value}`);
  }

  return date;
}
