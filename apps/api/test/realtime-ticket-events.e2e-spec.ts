import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RealtimeEventBroadcaster } from '../src/modules/realtime/realtime-event.broadcaster';
import { RealtimeTicketEventsService } from '../src/modules/realtime/realtime-ticket-events.service';
import { REALTIME_EVENTS } from '../src/modules/realtime/realtime.types';
import { TICKET_EVENTS } from '../src/modules/tickets/ticket-events';

describe('RealtimeTicketEventsService', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  const broadcaster = {
    broadcast: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        RealtimeTicketEventsService,
        {
          provide: RealtimeEventBroadcaster,
          useValue: broadcaster,
        },
      ],
    }).compile();

    await module.init();

    eventEmitter = module.get(EventEmitter2);
  });

  it('should broadcast ticket.created to the organization room', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.CREATED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.TICKET_CREATED,
      organizationId: 'org-1',
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: 'org-1',
        },
      ],
    });
  });

  it('should broadcast ticket.updated to organization and ticket rooms', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.UPDATED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.TICKET_UPDATED,
      organizationId: 'org-1',
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: 'org-1',
        },
        {
          type: 'ticket',
          organizationId: 'org-1',
          ticketId: 'ticket-1',
        },
      ],
    });
  });

  it('should broadcast status changes to organization and ticket rooms', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      recipientIds: ['user-2'],
      fromStatus: 'OPEN',
      toStatus: 'IN_PROGRESS',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.STATUS_CHANGED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.TICKET_STATUS_CHANGED,
      organizationId: 'org-1',
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: 'org-1',
        },
        {
          type: 'ticket',
          organizationId: 'org-1',
          ticketId: 'ticket-1',
        },
      ],
    });
  });

  it('should broadcast assignment changes to the recipient user room', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      recipientId: 'user-2',
      assigneeId: 'user-2',
      previousAssigneeId: null,
      teamId: 'team-1',
      previousTeamId: null,
      activityType: 'ASSIGNEE_CHANGED',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.ASSIGNEE_CHANGED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.TICKET_ASSIGNEE_CHANGED,
      organizationId: 'org-1',
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: 'org-1',
        },
        {
          type: 'ticket',
          organizationId: 'org-1',
          ticketId: 'ticket-1',
        },
        {
          type: 'user',
          organizationId: 'org-1',
          userId: 'user-2',
        },
      ],
    });
  });

  it('should broadcast ticket.comment.added to organization and ticket rooms', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      recipientIds: ['user-2'],
      commentId: 'comment-1',
      commentType: 'PUBLIC',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.COMMENT_ADDED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.TICKET_COMMENT_ADDED,
      organizationId: 'org-1',
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: 'org-1',
        },
        {
          type: 'ticket',
          organizationId: 'org-1',
          ticketId: 'ticket-1',
        },
      ],
    });
  });

  it('should broadcast ticket.comment.updated to organization and ticket rooms', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      recipientIds: ['user-2'],
      commentId: 'comment-1',
      commentType: 'PUBLIC',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.COMMENT_UPDATED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.TICKET_COMMENT_UPDATED,
      organizationId: 'org-1',
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: 'org-1',
        },
        {
          type: 'ticket',
          organizationId: 'org-1',
          ticketId: 'ticket-1',
        },
      ],
    });
  });

  it('should broadcast ticket.comment.deleted to organization and ticket rooms', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      recipientIds: ['user-2'],
      commentId: 'comment-1',
      commentType: 'PUBLIC',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.COMMENT_DELETED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.TICKET_COMMENT_DELETED,
      organizationId: 'org-1',
      payload: event,
      targets: [
        {
          type: 'organization',
          organizationId: 'org-1',
        },
        {
          type: 'ticket',
          organizationId: 'org-1',
          ticketId: 'ticket-1',
        },
      ],
    });
  });

  it('should broadcast ticket.status_changed to organization and ticket rooms', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      occurredAt: new Date(),
      previousStatus: 'OPEN',
      status: 'RESOLVED',
    };

    eventEmitter.emit(TICKET_EVENTS.STATUS_CHANGED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        event: REALTIME_EVENTS.TICKET_STATUS_CHANGED,
        organizationId: 'org-1',
        payload: event,
      }),
    );
  });

  it('should broadcast ticket.team_changed to organization and ticket rooms', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      teamId: 'team-1',
      previousTeamId: null,
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.TEAM_CHANGED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        event: REALTIME_EVENTS.TICKET_TEAM_CHANGED,
        organizationId: 'org-1',
        payload: event,
      }),
    );
  });

  it('should broadcast ticket comments to organization and ticket rooms', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      commentId: 'comment-1',
      actorId: 'user-1',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.COMMENT_ADDED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        event: REALTIME_EVENTS.TICKET_COMMENT_ADDED,
        organizationId: 'org-1',
        payload: event,
        targets: [
          {
            type: 'organization',
            organizationId: 'org-1',
          },
          {
            type: 'ticket',
            organizationId: 'org-1',
            ticketId: 'ticket-1',
          },
        ],
      }),
    );
  });

  it('should include the recipient user room when assignee changes include a recipient', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      recipientId: 'user-2',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.ASSIGNEE_CHANGED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        event: REALTIME_EVENTS.TICKET_ASSIGNEE_CHANGED,
        targets: [
          {
            type: 'organization',
            organizationId: 'org-1',
          },
          {
            type: 'ticket',
            organizationId: 'org-1',
            ticketId: 'ticket-1',
          },
          {
            type: 'user',
            organizationId: 'org-1',
            userId: 'user-2',
          },
        ],
      }),
    );
  });

  it('should not include a user room when assignee changes have no recipient', async () => {
    const event = {
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      recipientId: null,
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.ASSIGNEE_CHANGED, event);

    await new Promise((resolve) => setImmediate(resolve));

    const call = broadcaster.broadcast.mock.calls[0][0];

    expect(call.targets).toEqual([
      {
        type: 'organization',
        organizationId: 'org-1',
      },
      {
        type: 'ticket',
        organizationId: 'org-1',
        ticketId: 'ticket-1',
      },
    ]);
  });

  it('should broadcast ticket activity creation to organization and ticket rooms', async () => {
    const event = {
      id: 'activity-1',
      ticketId: 'ticket-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      type: 'STATUS_CHANGED',
      metadata: {
        from: 'OPEN',
        to: 'IN_PROGRESS',
      },
      createdAt: new Date(),
      actor: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      },
    };

    eventEmitter.emit(TICKET_EVENTS.ACTIVITY_CREATED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        event: REALTIME_EVENTS.TICKET_ACTIVITY_CREATED,
        organizationId: 'org-1',
        payload: event,
        targets: [
          {
            type: 'organization',
            organizationId: 'org-1',
          },
          {
            type: 'ticket',
            organizationId: 'org-1',
            ticketId: 'ticket-1',
          },
        ],
      }),
    );
  });
});
