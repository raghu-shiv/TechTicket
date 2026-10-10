export interface EmployeeDashboardMetricPoint {
  id: string;
  name: string;
  count: number;
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
      openWorkload: number;
      resolvedTickets: number;
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
    resolutionTrend: Array<{
      date: string;
      resolvedTickets: number;
      averageResolutionMinutes: number | null;
    }>;
    workloadDistribution: EmployeeDashboardMetricPoint[];
    teamComparison: EmployeeDashboardMetricPoint[];
    availableEmployees: Array<{ id: string; name: string }>;
    availableTeams: Array<{ id: string; name: string }>;
  };
  meta: {
    organizationScoped: true;
    queryVersion: 1;
    accessScope: "ORGANIZATION" | "EMPLOYEE" | "SELF";
    employeeId: string | null;
    dateField: "createdAt" | "updatedAt";
    dateFrom: string | null;
    dateTo: string | null;
    resolutionTrendDateField: "resolvedAt";
    reopenDefinition: string;
    currentWorkloadAsOf: string;
  };
}

export interface GetEmployeeDashboardParams {
  from?: string;
  to?: string;
  dateField?: "createdAt" | "updatedAt";
  employeeId?: string;
  teamId?: string;
  priority?: string;
  status?: string;
  type?: string;
  productId?: string;
  requesterId?: string;
}
