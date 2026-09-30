import type { Socket } from 'socket.io';

import type { AuthContext } from '../../common/auth/auth.types';

export const REALTIME_ROOMS = {
  organization: (organizationId: string) => `organization:${organizationId}`,

  ticket: (ticketId: string) => `ticket:${ticketId}`,

  user: (userId: string) => `user:${userId}`,
} as const;

export const REALTIME_EVENTS = {
  CONNECTED: 'realtime.connected',

  SUBSCRIBE_TICKET: 'ticket.subscribe',
  TICKET_SUBSCRIBED: 'ticket.subscribed',

  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  TICKET_STATUS_CHANGED: 'ticket.status.changed',
  TICKET_ASSIGNEE_CHANGED: 'ticket.assignee.changed',
  TICKET_UNASSIGNED_ADDED: 'ticket.unassigned.added',
  TICKET_UNASSIGNED_REMOVED: 'ticket.unassigned.removed',
  TICKET_TEAM_CHANGED: 'ticket.team.changed',

  TICKET_COMMENT_ADDED: 'ticket.comment.added',
  TICKET_COMMENT_UPDATED: 'ticket.comment.updated',
  TICKET_COMMENT_DELETED: 'ticket.comment.deleted',

  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_APPROVED: 'approval.approved',
  APPROVAL_REJECTED: 'approval.rejected',
  APPROVAL_CANCELLED: 'approval.cancelled',

  SLA_FIRST_RESPONSE_BREACHED: 'ticket.sla.first_response.breached',
  SLA_RESOLUTION_BREACHED: 'ticket.sla.resolution.breached',

  NOTIFICATION_CREATED: 'notification.created',
} as const;

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export interface RealtimeSocketData {
  auth?: AuthContext;
}

export type RealtimeSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  RealtimeSocketData
>;
