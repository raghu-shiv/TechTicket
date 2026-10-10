export interface EmployeeDashboardMetricPoint {
  id: string;
  name: string;
  count: number;
}

export interface EmployeeDashboardResolutionTrendPoint {
  /** UTC date bucket based on Ticket.resolvedAt. */
  date: string;
  resolvedTickets: number;
  averageResolutionMinutes: number | null;
}

export interface EmployeeDashboardRateMetric {
  completed: number;
  compliant: number;
  breached: number;
  complianceRate: number | null;
}

export interface EmployeeDashboardResponse {
  data: {
    metrics: {
      ticketCount: number;
      assignedTickets: number;
      /** Active (OPEN / IN_PROGRESS / PENDING) tickets in the selected cohort. */
      openWorkload: number;
      /** Tickets in the selected cohort whose current resolvedAt is non-null. */
      resolvedTickets: number;
      /** Current active assigned tickets, independent of the selected date range. */
      currentWorkload: number;
      reopenedTickets: number;
      averageFirstResponseMinutes: number | null;
      averageResolutionMinutes: number | null;
      sla: {
        tracked: number;
        breached: number;
        compliant: number;
        complianceRate: number | null;
        firstResponse: EmployeeDashboardRateMetric;
        resolution: EmployeeDashboardRateMetric;
      };
    };
    resolutionTrend: EmployeeDashboardResolutionTrendPoint[];
    /** Current active assigned tickets by AGENT. Admin/owner only; agents receive themselves only. */
    workloadDistribution: EmployeeDashboardMetricPoint[];
    /** Current active assigned tickets by team. Admin/owner only. */
    teamComparison: EmployeeDashboardMetricPoint[];
    /** Directory entries are intentionally omitted for AGENT responses. */
    availableEmployees: Array<{ id: string; name: string }>;
    /** Agents see only teams they belong to; owner/admin see all teams in the organization. */
    availableTeams: Array<{ id: string; name: string }>;
  };
  meta: {
    organizationScoped: true;
    queryVersion: 1;
    accessScope: 'ORGANIZATION' | 'EMPLOYEE' | 'SELF';
    employeeId: string | null;
    dateField: 'createdAt' | 'updatedAt';
    dateFrom: string | null;
    dateTo: string | null;
    /** The resolution trend uses resolvedAt even when KPI cohort filtering uses createdAt/updatedAt. */
    resolutionTrendDateField: 'resolvedAt';
    reopenDefinition: string;
    currentWorkloadAsOf: string;
  };
}
