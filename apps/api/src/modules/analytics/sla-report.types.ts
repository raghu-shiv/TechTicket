export interface SlaReportSummary {
  totalTracked: number;

  breached: number;
  compliant: number;
  complianceRate: number | null;

  atRisk: number;
  active: number;
  resolved: number;

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
