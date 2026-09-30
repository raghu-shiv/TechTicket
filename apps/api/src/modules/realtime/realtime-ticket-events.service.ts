import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { TICKET_EVENTS } from '../tickets/ticket-events';
import type {
  TicketAssignmentNotificationEvent,
  TicketCommentNotificationEvent,
  TicketStatusNotificationEvent,
} from '../tickets/ticket-notification-events';
import type { RealtimeBroadcastTarget } from './realtime-event.types';
import { RealtimeEventBroadcaster } from './realtime-event.broadcaster';
import { REALTIME_EVENTS } from './realtime.types';

interface TicketDomainEvent {
  ticketId: string;
  organizationId: string;
  actorId?: string;
  occurredAt?: Date;
}

interface TicketCreatedEvent extends TicketDomainEvent {}

interface TicketUpdatedEvent extends TicketDomainEvent {}

interface TicketTeamChangedEvent extends TicketDomainEvent {
  teamId: string | null;
  previousTeamId: string | null;
}

@Injectable()
export class RealtimeTicketEventsService {
  constructor(
    private readonly realtimeEventBroadcaster: RealtimeEventBroadcaster,
  ) {}

  @OnEvent(TICKET_EVENTS.CREATED)
  handleTicketCreated(event: TicketCreatedEvent): void {
    this.realtimeEventBroadcaster.broadcast({
      event: REALTIME_EVENTS.TICKET_CREATED,
      organizationId: event.organizationId,
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: event.organizationId,
        },
      ],
    });
  }

  @OnEvent(TICKET_EVENTS.UPDATED)
  handleTicketUpdated(event: TicketUpdatedEvent): void {
    this.realtimeEventBroadcaster.broadcast({
      event: REALTIME_EVENTS.TICKET_UPDATED,
      organizationId: event.organizationId,
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: event.organizationId,
        },
        {
          type: 'ticket',
          organizationId: event.organizationId,
          ticketId: event.ticketId,
        },
      ],
    });
  }

  @OnEvent(TICKET_EVENTS.STATUS_CHANGED)
  handleStatusChanged(event: TicketStatusNotificationEvent): void {
    this.realtimeEventBroadcaster.broadcast({
      event: REALTIME_EVENTS.TICKET_STATUS_CHANGED,
      organizationId: event.organizationId,
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: event.organizationId,
        },
        {
          type: 'ticket',
          organizationId: event.organizationId,
          ticketId: event.ticketId,
        },
      ],
    });
  }

  @OnEvent(TICKET_EVENTS.ASSIGNEE_CHANGED)
  handleAssigneeChanged(event: TicketAssignmentNotificationEvent): void {
    const targets: RealtimeBroadcastTarget[] = [
      {
        type: 'organization' as const,
        organizationId: event.organizationId,
      },
      {
        type: 'ticket' as const,
        organizationId: event.organizationId,
        ticketId: event.ticketId,
      },
    ];

    if (event.recipientId) {
      targets.push({
        type: 'user' as const,
        organizationId: event.organizationId,
        userId: event.recipientId,
      });
    }

    /*
     * Preserve the existing assignee-change realtime event.
     */
    this.realtimeEventBroadcaster.broadcast({
      event: REALTIME_EVENTS.TICKET_ASSIGNEE_CHANGED,
      organizationId: event.organizationId,
      payload: event,
      targets,
    });

    /*
     * 4-I.7.2
     *
     * A ticket is in the unassigned queue when assigneeId === null.
     *
     * Queue transitions therefore happen only on:
     *
     * assigned -> unassigned : queue entry
     * unassigned -> assigned : queue removal
     *
     * assigned -> assigned does not change queue membership.
     */
    const enteredUnassignedQueue =
      event.previousAssigneeId !== null && event.assigneeId === null;

    const leftUnassignedQueue =
      event.previousAssigneeId === null && event.assigneeId !== null;

    /*
     * 4-I.7.4
     *
     * Ticket entered the unassigned queue.
     */
    if (enteredUnassignedQueue) {
      this.realtimeEventBroadcaster.broadcast({
        event: REALTIME_EVENTS.TICKET_UNASSIGNED_ADDED,
        organizationId: event.organizationId,
        payload: event,
        targets: [
          {
            type: 'organization',
            organizationId: event.organizationId,
          },
        ],
      });
    }

    /*
     * 4-I.7.3
     *
     * Ticket left the unassigned queue because it was assigned.
     */
    if (leftUnassignedQueue) {
      this.realtimeEventBroadcaster.broadcast({
        event: REALTIME_EVENTS.TICKET_UNASSIGNED_REMOVED,
        organizationId: event.organizationId,
        payload: event,
        targets: [
          {
            type: 'organization',
            organizationId: event.organizationId,
          },
        ],
      });
    }
  }

  @OnEvent(TICKET_EVENTS.TEAM_CHANGED)
  handleTeamChanged(event: TicketTeamChangedEvent): void {
    this.realtimeEventBroadcaster.broadcast({
      event: REALTIME_EVENTS.TICKET_TEAM_CHANGED,
      organizationId: event.organizationId,
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: event.organizationId,
        },
        {
          type: 'ticket',
          organizationId: event.organizationId,
          ticketId: event.ticketId,
        },
      ],
    });
  }

  @OnEvent(TICKET_EVENTS.COMMENT_ADDED)
  handleCommentAdded(event: TicketCommentNotificationEvent): void {
    this.broadcastCommentEvent(REALTIME_EVENTS.TICKET_COMMENT_ADDED, event);
  }

  @OnEvent(TICKET_EVENTS.COMMENT_UPDATED)
  handleCommentUpdated(event: TicketCommentNotificationEvent): void {
    this.broadcastCommentEvent(REALTIME_EVENTS.TICKET_COMMENT_UPDATED, event);
  }

  @OnEvent(TICKET_EVENTS.COMMENT_DELETED)
  handleCommentDeleted(event: TicketCommentNotificationEvent): void {
    this.broadcastCommentEvent(REALTIME_EVENTS.TICKET_COMMENT_DELETED, event);
  }

  private broadcastCommentEvent(
    realtimeEvent:
      | typeof REALTIME_EVENTS.TICKET_COMMENT_ADDED
      | typeof REALTIME_EVENTS.TICKET_COMMENT_UPDATED
      | typeof REALTIME_EVENTS.TICKET_COMMENT_DELETED,
    event: TicketCommentNotificationEvent,
  ): void {
    this.realtimeEventBroadcaster.broadcast({
      event: realtimeEvent,
      organizationId: event.organizationId,
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: event.organizationId,
        },
        {
          type: 'ticket',
          organizationId: event.organizationId,
          ticketId: event.ticketId,
        },
      ],
    });
  }
}
