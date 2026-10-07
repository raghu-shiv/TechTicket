export interface ProductAnalyticsPriorityPoint {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface ProductAnalyticsTrendPoint {
  date: string;
  count: number;
}

export interface ProductAnalyticsProduct {
  id: string;
  name: string;
  isActive: boolean;

  ticketVolume: number;
  activeTickets: number;
  resolvedClosedTickets: number;

  priorityDistribution: ProductAnalyticsPriorityPoint[];

  sla: {
    tracked: number;
    breached: number;
    compliant: number;
    complianceRate: number | null;
  };

  tat: {
    resolved: number;
    averageResolutionMinutes: number | null;
    medianResolutionMinutes: number | null;
  };

  trend: ProductAnalyticsTrendPoint[];
}

export interface ProductAnalyticsSummary {
  totalTickets: number;
  activeTickets: number;
  resolvedClosedTickets: number;
  productsWithTickets: number;

  slaTracked: number;
  slaBreached: number;
  slaComplianceRate: number | null;

  averageResolutionMinutes: number | null;
  medianResolutionMinutes: number | null;
}

export interface ProductAnalyticsResponse {
  data: {
    summary: ProductAnalyticsSummary;
    products: ProductAnalyticsProduct[];
  };

  meta: {
    query: {
      dateField: "createdAt" | "updatedAt";
      dateFrom: string | null;
      dateTo: string | null;
      productId: string | null;
      organizationScoped: true;
      queryVersion: 1;
    };
  };
}

export interface GetProductAnalyticsParams {
  from?: string;
  to?: string;
  dateField?: "createdAt" | "updatedAt";

  productId?: string;

  status?: string;
  priority?: string;
  type?: string;

  teamId?: string;
  assigneeId?: string;
  requesterId?: string;

  unassigned?: boolean;
  unassignedTeam?: boolean;
}
