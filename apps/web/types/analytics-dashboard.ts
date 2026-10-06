export interface AnalyticsDashboardMetrics {
  total: number;
  active: number;
  resolvedClosed: number;
  unassigned: number;

  sla: {
    tracked: number;
    breached: number;
    compliant: number;
    complianceRate: number | null;

    firstResponse: {
      completed: number;
      compliant: number;
      breached: number;
      complianceRate: number | null;
    };

    resolution: {
      completed: number;
      compliant: number;
      breached: number;
      complianceRate: number | null;
    };
  };

  tat: {
    resolved: number;
    averageResolutionMinutes: number | null;
    medianResolutionMinutes: number | null;
  };
}

export interface AnalyticsDashboardResponse {
  data: {
    metrics: AnalyticsDashboardMetrics;

    volumeTrend: Array<{
      date: string;
      count: number;
    }>;

    priorityDistribution: Array<{
      key: string;
      label: string;
      count: number;
      percentage: number;
    }>;

    teamWorkload: Array<{
      id: string | null;
      name: string;
      count: number;
    }>;

    assigneeWorkload: Array<{
      id: string | null;
      name: string;
      count: number;
    }>;
  };

  meta: {
    query: {
      dateField: "createdAt" | "updatedAt";
      dateFrom: string | null;
      dateTo: string | null;
      organizationScoped: true;
      queryVersion: 1;
    };
  };
}

export interface GetAnalyticsDashboardParams {
  from?: string;
  to?: string;
  dateField?: "createdAt" | "updatedAt";
  status?: string;
  priority?: string;
  type?: string;
  teamId?: string;
  assigneeId?: string;
  requesterId?: string;
  unassigned?: boolean;
  unassignedTeam?: boolean;
}
