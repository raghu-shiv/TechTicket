import type { TicketListParams } from "@/types/tickets";
import type { SavedFilterDefinition } from "@/types/saved-filters";

export interface TicketLibraryReportPoint {
  key: string;
  label: string;
  count: number;
  id: string | null;
}

export interface TicketLibraryDatePoint {
  date: string;
  count: number;
}

export interface SavedFilterAnalyticsPoint {
  id: string;
  name: string;
  count: number;
  updatedAt: string;
  filters: SavedFilterDefinition;
}

export type TicketLibraryReportParams = Omit<
  TicketListParams,
  "page" | "limit"
> & {
  dateField?: "createdAt" | "updatedAt";
};

export interface TicketLibraryReportResponse {
  data: {
    filteredCount: number;
    byStatus: TicketLibraryReportPoint[];
    byPriority: TicketLibraryReportPoint[];
    byTeam: TicketLibraryReportPoint[];
    byEmployee: TicketLibraryReportPoint[];
    byDate: TicketLibraryDatePoint[];
    unassignedCount: number;
    savedFilters: SavedFilterAnalyticsPoint[];
  };
  meta: {
    organizationScoped: true;
    queryVersion: number;
    dateField: "createdAt" | "updatedAt";
    filters: Record<string, string | boolean | null>;
  };
}
