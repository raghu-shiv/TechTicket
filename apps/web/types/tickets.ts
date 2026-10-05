export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "PENDING"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketType =
  | "INCIDENT"
  | "SERVICE_REQUEST"
  | "QUESTION"
  | "PROBLEM";

export type TicketSortField =
  | "createdAt"
  | "updatedAt"
  | "priority"
  | "status"
  | "title";

export type TicketSortOrder = "asc" | "desc";

export interface TicketUser {
  id: string;
  name: string;
  email: string;
}

export interface TicketTeam {
  id: string;
  name: string;
}

export type SlaEscalationType = "FIRST_RESPONSE_BREACH" | "RESOLUTION_BREACH";

export interface TicketSlaEscalation {
  id: string;
  type: SlaEscalationType;
  createdAt: string;
}

export interface TicketSla {
  id: string;

  firstResponseMinutes: number;
  resolutionMinutes: number;

  firstResponseDueAt: string;
  resolutionDueAt: string;

  firstRespondedAt: string | null;

  firstResponseBreachedAt: string | null;
  resolutionBreachedAt: string | null;

  slaEscalations: TicketSlaEscalation[];
}

export type TicketActivityType =
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "PRIORITY_CHANGED"
  | "STATUS_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "TEAM_CHANGED"
  | "COMMENT_ADDED"
  | "COMMENT_UPDATED"
  | "COMMENT_DELETED"
  | "SLA_FIRST_RESPONSE_BREACHED"
  | "SLA_RESOLUTION_BREACHED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_APPROVED"
  | "APPROVAL_REJECTED"
  | "APPROVAL_CANCELLED";

export type TicketActivityCategory =
  | "TICKET"
  | "WORKFLOW"
  | "COMMUNICATION"
  | "SLA"
  | "APPROVAL";

export interface TicketActivity {
  id: string;
  ticketId: string;
  organizationId: string;
  actorId: string | null;
  type: TicketActivityType;
  metadata: Record<string, unknown> | null;
  createdAt: string;

  actor: TicketUser | null;

  category: TicketActivityCategory;

  description: string;

  timeline: {
    date: string;
    time: string;
    timestamp: string;
  };

  actorPresentation: {
    displayName: string;
    email: string;
    userId: string;
  } | null;
}

export interface TicketActivityListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TicketActivityResponse {
  data: TicketActivity[];
  meta: TicketActivityListMeta;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  organizationId: string;

  requesterId: string;
  assigneeId: string | null;
  teamId: string | null;

  title: string;
  description: string;

  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;

  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;

  sla: TicketSla | null;

  requester: TicketUser;
  assignee: TicketUser | null;
  team: TicketTeam | null;
}

export interface TicketListParams {
  page?: number;
  limit?: number;

  search?: string;

  createdFrom?: string;
  createdTo?: string;

  updatedFrom?: string;
  updatedTo?: string;

  sortBy?: TicketSortField;
  sortOrder?: TicketSortOrder;

  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;

  assigneeId?: string;
  teamId?: string;
  requesterId?: string;

  unassigned?: boolean;
  unassignedTeam?: boolean;

  slaBreached?: boolean;
}

export interface TicketListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TicketListResponse {
  data: Ticket[];
  meta: TicketListMeta;
}
