import type { TicketPriority, TicketStatus, TicketType } from '@prisma/client';

export type SavedFilterSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'priority'
  | 'status'
  | 'title';

export type SavedFilterSortOrder = 'asc' | 'desc';

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
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sortBy?: SavedFilterSortField;
  sortOrder?: SavedFilterSortOrder;
  limit?: number;
}
