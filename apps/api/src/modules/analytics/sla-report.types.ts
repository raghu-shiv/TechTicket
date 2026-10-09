export interface SlaReportMetric {
  completed: number;
  compliant: number;
  breached: number;
  complianceRate: number | null;
}

export interface SlaReportComparisonMetric extends SlaReportMetric {
  breachRate: number | null;
}

export interface SlaReportComparison {
  firstResponse: SlaReportComparisonMetric;
  resolution: SlaReportComparisonMetric;

  complianceGapPercentagePoints: number | null;
  breachGapPercentagePoints: number | null;
}

export interface SlaReportTrendPoint {
  date: string;
  tracked: number;
  breached: number;
  breachRate: number;
  firstResponse: SlaReportMetric;
  resolution: SlaReportMetric;
}

export interface SlaReportPriorityPoint {
  key: string;
  label: string;
  tracked: number;
  breached: number;
  breachRate: number;
  atRisk: number;
  active: number;
  resolved: number;
  firstResponse: SlaReportMetric;
  resolution: SlaReportMetric;
}

export interface SlaReportTeamPoint {
  id: string | null;
  key: string;
  label: string;
  tracked: number;
  breached: number;
  breachRate: number;
  atRisk: number;
  active: number;
  resolved: number;
  firstResponse: SlaReportMetric;
  resolution: SlaReportMetric;
}

export interface SlaReportAssigneePoint {
  id: string | null;
  key: string;
  label: string;
  tracked: number;
  breached: number;
  breachRate: number;
  atRisk: number;
  active: number;
  resolved: number;
  firstResponse: SlaReportMetric;
  resolution: SlaReportMetric;
}

export interface SlaReportSummary {
  totalTracked: number;
  breached: number;
  atRisk: number;
  active: number;
  resolved: number;
  firstResponse: SlaReportMetric;
  resolution: SlaReportMetric;
}

export interface SlaBreachDimensionPoint {
  tracked: number;
  breached: number;
  breachRate: number;
  atRisk: number;
  atRiskRate: number;
}

export interface SlaBreachNamedDimensionPoint extends SlaBreachDimensionPoint {
  id: string | null;
  key: string;
  label: string;
}

export interface SlaBreachTrendPoint extends SlaBreachDimensionPoint {
  date: string;
}

export interface SlaBreachAnalysis {
  summary: {
    tracked: number;
    breached: number;
    breachRate: number;
    atRisk: number;
    atRiskRate: number;
  };

  firstResponse: {
    breached: number;
    breachRate: number;
  };

  resolution: {
    breached: number;
    breachRate: number;
  };

  trend: SlaBreachTrendPoint[];

  dimensions: {
    priority: Array<
      SlaBreachDimensionPoint & {
        key: string;
        label: string;
      }
    >;

    team: SlaBreachNamedDimensionPoint[];

    assignee: SlaBreachNamedDimensionPoint[];
  };

  drillDown: {
    allBreached: string;
    atRisk: string;
    firstResponseBreached: string;
    resolutionBreached: string;
  };
}

export interface SlaReportResponse {
  data: {
    summary: SlaReportSummary;
    comparison: SlaReportComparison;
    trend: SlaReportTrendPoint[];
    byPriority: SlaReportPriorityPoint[];
    byTeam: SlaReportTeamPoint[];
    byAssignee: SlaReportAssigneePoint[];
    breachAnalysis: SlaBreachAnalysis;
  };

  meta: {
    query: {
      dateField: 'createdAt' | 'updatedAt';
      dateFrom: string | null;
      dateTo: string | null;

      status: string | null;
      priority: string | null;
      type: string | null;

      teamId: string | null;
      assigneeId: string | null;
      requesterId: string | null;
      productId: string | null;

      unassigned: boolean | null;
      unassignedTeam: boolean | null;

      organizationScoped: true;
      queryVersion: 1;
    };
  };
}
