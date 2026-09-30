import { TicketActivityType } from '@prisma/client';

export const TICKET_ACTIVITY_CATEGORIES = [
  'TICKET',
  'WORKFLOW',
  'COMMUNICATION',
  'SLA',
  'APPROVAL',
] as const;

export type TicketActivityCategory =
  (typeof TICKET_ACTIVITY_CATEGORIES)[number];

export function getTicketActivityCategory(
  type: TicketActivityType,
): TicketActivityCategory {
  switch (type) {
    case TicketActivityType.TICKET_CREATED:
    case TicketActivityType.TICKET_UPDATED:
    case TicketActivityType.PRIORITY_CHANGED:
      return 'TICKET';

    case TicketActivityType.STATUS_CHANGED:
    case TicketActivityType.ASSIGNEE_CHANGED:
    case TicketActivityType.TEAM_CHANGED:
      return 'WORKFLOW';

    case TicketActivityType.COMMENT_ADDED:
    case TicketActivityType.COMMENT_UPDATED:
    case TicketActivityType.COMMENT_DELETED:
      return 'COMMUNICATION';

    case TicketActivityType.SLA_FIRST_RESPONSE_BREACHED:
    case TicketActivityType.SLA_RESOLUTION_BREACHED:
      return 'SLA';

    case TicketActivityType.APPROVAL_REQUESTED:
    case TicketActivityType.APPROVAL_APPROVED:
    case TicketActivityType.APPROVAL_REJECTED:
    case TicketActivityType.APPROVAL_CANCELLED:
      return 'APPROVAL';

    default: {
      const exhaustiveCheck: never = type;
      throw new Error(
        `Unsupported ticket activity type: ${String(exhaustiveCheck)}`,
      );
    }
  }
}
