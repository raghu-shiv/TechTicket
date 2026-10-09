export interface TatMetric {
  sampleSize: number;
  averageMinutes: number | null;
  medianMinutes: number | null;
  p75Minutes: number | null;
  p90Minutes: number | null;
  p95Minutes: number | null;
}

export interface TatDimensionPoint {
  id?: string | null;
  key: string;
  label: string;
  resolvedTickets: number;
  firstResponse: TatMetric;
  resolution: TatMetric;
}

export interface TatTrendPoint {
  date: string;
  createdTickets: number;
  firstResponse: TatMetric;
  resolution: TatMetric;
}

export interface TatTicketRow {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  firstRespondedAt: string | null;
  resolvedAt: string;
  resolutionMinutes: number;
  team: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
  product: { id: string; name: string } | null;
}

export interface TatReportResponse {
  data: {
    summary: {
      ticketCount: number;
      resolvedTicketCount: number;
      firstResponse: TatMetric;
      resolution: TatMetric;
    };
    trend: TatTrendPoint[];
    byPriority: TatDimensionPoint[];
    byTeam: TatDimensionPoint[];
    byAssignee: TatDimensionPoint[];
    byProduct: TatDimensionPoint[];
    resolvedTickets: TatTicketRow[];
  };
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    query: {
      dateField: "createdAt" | "updatedAt";
      dateFrom: string | null;
      dateTo: string | null;
      priority: string | null;
      status: string | null;
      type: string | null;
      teamId: string | null;
      assigneeId: string | null;
      requesterId: string | null;
      productId: string | null;
      unassigned: boolean | null;
      unassignedTeam: boolean | null;
      organizationScoped: true;
      queryVersion: number;
      durationUnit: "minutes";
      trendCohort: "createdAt";
    };
  };
}
