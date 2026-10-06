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

export interface AnalyticsDashboardVolumePoint {
  date: string;
  count: number;
}

export interface AnalyticsDashboardDistributionPoint {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface AnalyticsDashboardWorkloadPoint {
  id: string | null;
  name: string;
  count: number;
}

export interface AnalyticsDashboardResponse {
  data: {
    metrics: AnalyticsDashboardMetrics;

    volumeTrend: AnalyticsDashboardVolumePoint[];

    priorityDistribution: AnalyticsDashboardDistributionPoint[];

    teamWorkload: AnalyticsDashboardWorkloadPoint[];

    assigneeWorkload: AnalyticsDashboardWorkloadPoint[];
  };

  meta: {
    query: {
      dateField: 'createdAt' | 'updatedAt';
      dateFrom: string | null;
      dateTo: string | null;
      organizationScoped: true;
      queryVersion: 1;
    };
  };
}
