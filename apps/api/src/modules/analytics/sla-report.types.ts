export interface SlaReportMetric {
  completed: number;
  compliant: number;
  breached: number;
  complianceRate: number | null;
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
