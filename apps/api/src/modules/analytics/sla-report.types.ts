export interface SlaReportMetric {
  completed: number;
  compliant: number;
  breached: number;
  complianceRate: number | null;
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

export interface SlaReportSummary {
  totalTracked: number;

  breached: number;

  atRisk: number;

  active: number;

  resolved: number;

  firstResponse: SlaReportMetric;

  resolution: SlaReportMetric;
}

export interface SlaReportResponse {
  data: {
    summary: SlaReportSummary;

    trend: SlaReportTrendPoint[];

    byPriority: SlaReportPriorityPoint[];
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
