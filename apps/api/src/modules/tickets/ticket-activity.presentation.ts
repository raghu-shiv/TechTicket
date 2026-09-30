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

export interface TicketActivityTimelineMetadata {
  timestamp: string;
  date: string;
  time: string;
}

export interface TicketActivityDescriptionInput {
  ticketNumber?: string;
  priority?: string;
  type?: string;
  commentType?: string;
  from?: unknown;
  to?: unknown;
  approvalId?: string;
  approverId?: string;
  status?: string;
  comment?: string;
  commentId?: string;
  escalationId?: string;
  ticketSlaId?: string;
  [key: string]: unknown;
}

export interface TicketActivityActor {
  id: string;
  name: string;
  email: string;
}

export interface TicketActivityActorPresentation {
  displayName: string;
  email: string;
  userId: string;
}

export function getTicketActivityActorPresentation(
  actor: TicketActivityActor | null,
): TicketActivityActorPresentation | null {
  if (!actor) {
    return null;
  }

  return {
    displayName: actor.name,
    email: actor.email,
    userId: actor.id,
  };
}

export function getTicketActivityTimeline(
  createdAt: Date,
): TicketActivityTimelineMetadata {
  return {
    timestamp: createdAt.toISOString(),
    date: createdAt.toISOString().slice(0, 10),
    time: createdAt.toISOString().slice(11, 19),
  };
}

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

function formatActivityValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'unassigned';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function formatChangedField(
  field: string,
  value: TicketActivityDescriptionInput,
): string {
  const from = formatActivityValue(value.from);
  const to = formatActivityValue(value.to);

  switch (field) {
    case 'title':
      return `title from "${from}" to "${to}"`;

    case 'description':
      return 'description';

    case 'priority':
      return `priority from ${from} to ${to}`;

    case 'type':
      return `type from ${from} to ${to}`;

    default:
      return `${field} from ${from} to ${to}`;
  }
}

function getUpdatedFieldsDescription(
  metadata: TicketActivityDescriptionInput,
): string {
  const changedFields = Object.keys(metadata).filter(
    (key) =>
      ![
        'ticketNumber',
        'commentId',
        'commentType',
        'approvalId',
        'approverId',
        'status',
        'comment',
        'escalationId',
        'ticketSlaId',
      ].includes(key),
  );

  if (changedFields.length === 0) {
    return 'ticket details';
  }

  return changedFields
    .map((field) =>
      formatChangedField(
        field,
        metadata[field] as TicketActivityDescriptionInput,
      ),
    )
    .join(', ');
}

export function getTicketActivityDescription(
  type: TicketActivityType,
  metadata: TicketActivityDescriptionInput | null | undefined,
): string {
  const data = metadata ?? {};

  switch (type) {
    case TicketActivityType.TICKET_CREATED:
      return `Ticket ${data.ticketNumber ?? 'created'} was created`;

    case TicketActivityType.TICKET_UPDATED:
      return `Ticket details were updated: ${getUpdatedFieldsDescription(data)}`;

    case TicketActivityType.PRIORITY_CHANGED:
      return `Priority changed from ${formatActivityValue(data.from)} to ${formatActivityValue(data.to)}`;

    case TicketActivityType.STATUS_CHANGED:
      return `Status changed from ${formatActivityValue(data.from)} to ${formatActivityValue(data.to)}`;

    case TicketActivityType.ASSIGNEE_CHANGED:
      return `Assignee changed from ${formatActivityValue(data.from)} to ${formatActivityValue(data.to)}`;

    case TicketActivityType.TEAM_CHANGED:
      return `Team changed from ${formatActivityValue(data.from)} to ${formatActivityValue(data.to)}`;

    case TicketActivityType.COMMENT_ADDED:
      return `${data.commentType === 'INTERNAL' ? 'Internal' : 'Public'} comment added`;

    case TicketActivityType.COMMENT_UPDATED:
      return `${data.commentType === 'INTERNAL' ? 'Internal' : 'Public'} comment updated`;

    case TicketActivityType.COMMENT_DELETED:
      return `${data.commentType === 'INTERNAL' ? 'Internal' : 'Public'} comment deleted`;

    case TicketActivityType.SLA_FIRST_RESPONSE_BREACHED:
      return 'First response SLA breached';

    case TicketActivityType.SLA_RESOLUTION_BREACHED:
      return 'Resolution SLA breached';

    case TicketActivityType.APPROVAL_REQUESTED:
      return 'Approval requested';

    case TicketActivityType.APPROVAL_APPROVED:
      return 'Approval approved';

    case TicketActivityType.APPROVAL_REJECTED:
      return 'Approval rejected';

    case TicketActivityType.APPROVAL_CANCELLED:
      return 'Approval cancelled';

    default: {
      const exhaustiveCheck: never = type;
      throw new Error(
        `Unsupported ticket activity type: ${String(exhaustiveCheck)}`,
      );
    }
  }
}

export function getTicketActivityTypesForCategory(
  category: TicketActivityCategory,
): TicketActivityType[] {
  switch (category) {
    case 'TICKET':
      return [
        TicketActivityType.TICKET_CREATED,
        TicketActivityType.TICKET_UPDATED,
        TicketActivityType.PRIORITY_CHANGED,
      ];

    case 'WORKFLOW':
      return [
        TicketActivityType.STATUS_CHANGED,
        TicketActivityType.ASSIGNEE_CHANGED,
        TicketActivityType.TEAM_CHANGED,
      ];

    case 'COMMUNICATION':
      return [
        TicketActivityType.COMMENT_ADDED,
        TicketActivityType.COMMENT_UPDATED,
        TicketActivityType.COMMENT_DELETED,
      ];

    case 'SLA':
      return [
        TicketActivityType.SLA_FIRST_RESPONSE_BREACHED,
        TicketActivityType.SLA_RESOLUTION_BREACHED,
      ];

    case 'APPROVAL':
      return [
        TicketActivityType.APPROVAL_REQUESTED,
        TicketActivityType.APPROVAL_APPROVED,
        TicketActivityType.APPROVAL_REJECTED,
        TicketActivityType.APPROVAL_CANCELLED,
      ];

    default: {
      const exhaustiveCheck: never = category;
      throw new Error(
        `Unsupported ticket activity category: ${String(exhaustiveCheck)}`,
      );
    }
  }
}
