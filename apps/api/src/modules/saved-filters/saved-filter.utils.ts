import type { SavedFilterDefinition } from './saved-filter.types';

export function normalizeSavedFilter(
  filters: SavedFilterDefinition,
): SavedFilterDefinition {
  return {
    search: filters.search?.trim() || undefined,

    status: filters.status,
    priority: filters.priority,
    type: filters.type,

    assigneeId: filters.assigneeId,
    teamId: filters.teamId,
    requesterId: filters.requesterId,

    unassigned: filters.unassigned || undefined,
    unassignedTeam: filters.unassignedTeam || undefined,

    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,

    updatedFrom: filters.updatedFrom,
    updatedTo: filters.updatedTo,

    sortBy: filters.sortBy ?? 'updatedAt',
    sortOrder: filters.sortOrder ?? 'desc',

    limit: filters.limit ?? 20,
  };
}
