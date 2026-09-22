export const TICKET_EVENTS = {
  CREATED: 'ticket.created',
  UPDATED: 'ticket.updated',
  STATUS_CHANGED: 'ticket.status.changed',
  PRIORITY_CHANGED: 'ticket.priority.changed',
  ASSIGNEE_CHANGED: 'ticket.assignee.changed',
  TEAM_CHANGED: 'ticket.team.changed',
  COMMENT_ADDED: 'ticket.comment.added',
  COMMENT_UPDATED: 'ticket.comment.updated',
  COMMENT_DELETED: 'ticket.comment.deleted',
  SLA_FIRST_RESPONSE_BREACHED: 'ticket.sla.first_response_breached',
  SLA_RESOLUTION_BREACHED: 'ticket.sla.resolution_breached',
} as const;
