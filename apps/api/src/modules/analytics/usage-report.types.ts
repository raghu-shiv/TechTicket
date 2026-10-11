export interface UsageReportSummary {
  ticketsCreated: number;
  activitiesRecorded: number;
  commentsCreated: number;
  attachmentsUploaded: number;
  approvalRequests: number;
  approvalsApproved: number;
  approvalsRejected: number;
  activeUsers: number;
  activeAgents: number;
}

export interface UsageReportTrendPoint {
  date: string;
  ticketsCreated: number;
  activitiesRecorded: number;
  commentsCreated: number;
  attachmentsUploaded: number;
  approvalRequests: number;
}

export interface UsageReportResponse {
  summary: UsageReportSummary;
  trends: UsageReportTrendPoint[];
  period: {
    from: string | null;
    to: string | null;
  };
  metricAvailability: {
    notifications: 'unavailable';
  };
}
