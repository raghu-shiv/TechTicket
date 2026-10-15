export type NotificationType =
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "TICKET_ASSIGNED"
  | "TICKET_STATUS_CHANGED"
  | "TICKET_COMMENT_ADDED"
  | "TICKET_COMMENT_UPDATED"
  | "TICKET_COMMENT_DELETED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_APPROVED"
  | "APPROVAL_REJECTED"
  | "APPROVAL_CANCELLED"
  | "SLA_BREACHED";

export interface NotificationListItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  ticketId: string | null;
  createdAt: string;
  readAt: string | null;
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
  } | null;
}

export interface NotificationListResponse {
  data: NotificationListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
}

export interface NotificationRealtimePayload {
  notificationId: string;
  organizationId: string;
  recipientId: string;
}
