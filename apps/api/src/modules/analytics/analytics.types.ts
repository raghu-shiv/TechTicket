import type { TicketPriority, TicketStatus, TicketType } from '@prisma/client';

export const ANALYTICS_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;

export type AnalyticsDateField = 'createdAt' | 'updatedAt';

export type AnalyticsSortField = (typeof ANALYTICS_SORT_FIELDS)[number];

export type AnalyticsSortOrder = 'asc' | 'desc';

export interface AnalyticsDateRange {
  from: Date | null;
  to: Date | null;
}

export interface AnalyticsDimensions {
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;

  teamId?: string;
  assigneeId?: string;
  requesterId?: string;

  unassigned?: boolean;
  unassignedTeam?: boolean;
}

export interface AnalyticsQueryInput extends AnalyticsDimensions {
  dateField?: AnalyticsDateField;
  from?: string | Date;
  to?: string | Date;

  sortBy?: AnalyticsSortField;
  sortOrder?: AnalyticsSortOrder;

  page?: number;
  limit?: number;
}

export interface NormalizedAnalyticsQuery {
  organizationId: string;

  dateField: AnalyticsDateField;

  dateRange: AnalyticsDateRange;

  dimensions: AnalyticsDimensions;

  sortBy: AnalyticsSortField;
  sortOrder: AnalyticsSortOrder;

  page: number;
  limit: number;
}

export interface AnalyticsDimensions {
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;

  teamId?: string;
  assigneeId?: string;
  requesterId?: string;
  productId?: string;

  unassigned?: boolean;
  unassignedTeam?: boolean;
}
