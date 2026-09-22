import { TicketActivityType } from '@prisma/client';

export interface TicketAssignmentNotificationEvent {
  ticketId: string;
  organizationId: string;
  actorId: string;
  recipientId: string | null;
  assigneeId: string | null;
  previousAssigneeId: string | null;
  teamId: string | null;
  previousTeamId: string | null;
  activityType: TicketActivityType;
  occurredAt: Date;
}

export interface TicketStatusNotificationEvent {
  ticketId: string;
  organizationId: string;
  actorId: string;
  recipientIds: string[];
  fromStatus: string;
  toStatus: string;
  occurredAt: Date;
}

export interface TicketCommentNotificationEvent {
  ticketId: string;
  organizationId: string;
  actorId: string;
  recipientIds: string[];
  commentId: string;
  commentType: string;
  occurredAt: Date;
}
