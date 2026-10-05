export type SlaDashboardView =
  | "ALL"
  | "ACTIVE"
  | "AT_RISK"
  | "BREACHED"
  | "RESOLVED"
  | "FIRST_RESPONSE_BREACHED"
  | "RESOLUTION_BREACHED";

export interface SlaDashboardMetrics {
  total: number;
  active: number;
  atRisk: number;
  breached: number;
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

export interface SlaDashboardTicket {
  id: string;
  ticketNumber: string;
  title: string;

  status: string;
  priority: string;

  team: {
    id: string;
    name: string | null;
  } | null;

  assignee: {
    id: string;
    name: string | null;
  } | null;

  createdAt: string;
  resolvedAt: string | null;

  firstResponse: {
    dueAt: string;
    respondedAt: string | null;
    breachedAt: string | null;
  };

  resolution: {
    dueAt: string;
    breachedAt: string | null;
  };
}

export interface SlaDashboardMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SlaDashboardResponse {
  data: {
    metrics: SlaDashboardMetrics;
    tickets: SlaDashboardTicket[];
  };

  meta: SlaDashboardMeta;
}
