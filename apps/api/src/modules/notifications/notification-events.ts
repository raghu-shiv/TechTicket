export const NOTIFICATION_EVENTS = {
  CREATED: 'notification.created',
} as const;

export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_UPDATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_COMMENT_ADDED'
  | 'TICKET_COMMENT_UPDATED'
  | 'TICKET_COMMENT_DELETED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_APPROVED'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_CANCELLED'
  | 'SLA_BREACHED';

export interface NotificationCreatedEvent {
  notificationId: string;
  organizationId: string;
  recipientId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
}
