import type {
  TicketListParams,
  TicketPriority,
  TicketSortField,
  TicketSortOrder,
  TicketStatus,
  TicketType,
} from "@/types/tickets";

export type SavedFilterSortField = TicketSortField;
export type SavedFilterSortOrder = TicketSortOrder;

export interface SavedFilterDefinition {
  search?: string;

  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;

  assigneeId?: string;
  teamId?: string;
  requesterId?: string;

  unassigned?: boolean;
  unassignedTeam?: boolean;
  slaBreached?: boolean;

  createdFrom?: string;
  createdTo?: string;

  updatedFrom?: string;
  updatedTo?: string;

  sortBy?: SavedFilterSortField;
  sortOrder?: SavedFilterSortOrder;

  limit?: number;
}

export interface SavedFilter {
  id: string;
  organizationId: string;
  userId: string;

  name: string;
  description: string | null;

  filters: SavedFilterDefinition;

  createdAt: string;
  updatedAt: string;
}

export interface SavedFiltersResponse {
  items: SavedFilter[];
}

export interface CreateSavedFilterInput {
  name: string;
  description?: string;
  filters: SavedFilterDefinition;
}

export interface UpdateSavedFilterInput {
  name?: string;
  description?: string;
  filters?: SavedFilterDefinition;
}

/**
 * Saved filters intentionally do not contain pagination.
 *
 * `page` belongs to the current ticket-library query, not to a
 * reusable saved filter definition.
 */
export type SavedFilterQuery = Omit<TicketListParams, "page">;
