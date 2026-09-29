import { describe, expect, it, vi } from 'vitest';

import { RealtimeBroadcastEvent } from './../src/modules/realtime/realtime-event.types';
import { RealtimeEventBroadcaster } from './../src/modules/realtime/realtime-event.broadcaster';
import {
  REALTIME_ROOMS,
  REALTIME_EVENTS,
} from './../src/modules/realtime/realtime.types';

describe('RealtimeEventBroadcaster', () => {
  function createBroadcaster() {
    const emit = vi.fn();

    const realtimeService = {
      getNamespace: vi.fn(() => ({
        to: vi.fn(() => ({
          emit,
        })),
      })),
    };

    const broadcaster = new RealtimeEventBroadcaster(realtimeService as never);

    return {
      broadcaster,
      realtimeService,
      emit,
    };
  }

  it('should broadcast an organization event to the organization room', () => {
    const { broadcaster, realtimeService, emit } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.TICKET_CREATED,
      organizationId: 'org-1',
      payload: {
        ticketId: 'ticket-1',
      },
      targets: [
        {
          type: 'organization',
          organizationId: 'org-1',
        },
      ],
    };

    broadcaster.broadcast(event);

    const namespace = realtimeService.getNamespace.mock.results[0].value;

    expect(namespace.to).toHaveBeenCalledWith(
      REALTIME_ROOMS.organization('org-1'),
    );

    expect(emit).toHaveBeenCalledWith(event.event, event.payload);
  });

  it('should broadcast a ticket event to the ticket room', () => {
    const { broadcaster, realtimeService, emit } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.TICKET_UPDATED,
      organizationId: 'org-1',
      payload: {
        ticketId: 'ticket-1',
      },
      targets: [
        {
          type: 'ticket',
          organizationId: 'org-1',
          ticketId: 'ticket-1',
        },
      ],
    };

    broadcaster.broadcast(event);

    const namespace = realtimeService.getNamespace.mock.results[0].value;

    expect(namespace.to).toHaveBeenCalledWith(
      REALTIME_ROOMS.ticket('ticket-1'),
    );

    expect(emit).toHaveBeenCalledWith(event.event, event.payload);
  });

  it('should broadcast a user event to the user room', () => {
    const { broadcaster, realtimeService, emit } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.NOTIFICATION_CREATED,
      organizationId: 'org-1',
      payload: {
        notificationId: 'notification-1',
      },
      targets: [
        {
          type: 'user',
          organizationId: 'org-1',
          userId: 'user-1',
        },
      ],
    };

    broadcaster.broadcast(event);

    const namespace = realtimeService.getNamespace.mock.results[0].value;

    expect(namespace.to).toHaveBeenCalledWith(REALTIME_ROOMS.user('user-1'));

    expect(emit).toHaveBeenCalledWith(event.event, event.payload);
  });

  it('should support multiple broadcast targets', () => {
    const { broadcaster, realtimeService, emit } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.TICKET_UPDATED,
      organizationId: 'org-1',
      payload: {
        ticketId: 'ticket-1',
      },
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
          userId: 'user-1',
        },
      ],
    };

    broadcaster.broadcast(event);

    const namespace = realtimeService.getNamespace.mock.results[0].value;

    expect(namespace.to).toHaveBeenCalledTimes(3);

    expect(namespace.to).toHaveBeenNthCalledWith(
      1,
      REALTIME_ROOMS.organization('org-1'),
    );

    expect(namespace.to).toHaveBeenNthCalledWith(
      2,
      REALTIME_ROOMS.ticket('ticket-1'),
    );

    expect(namespace.to).toHaveBeenNthCalledWith(
      3,
      REALTIME_ROOMS.user('user-1'),
    );

    expect(emit).toHaveBeenCalledTimes(3);

    expect(emit).toHaveBeenNthCalledWith(1, event.event, event.payload);

    expect(emit).toHaveBeenNthCalledWith(2, event.event, event.payload);

    expect(emit).toHaveBeenNthCalledWith(3, event.event, event.payload);
  });

  it('should reject a target belonging to another organization', () => {
    const { broadcaster, realtimeService } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.TICKET_CREATED,
      organizationId: 'org-1',
      payload: {
        ticketId: 'ticket-1',
      },
      targets: [
        {
          type: 'organization',
          organizationId: 'org-2',
        },
      ],
    };

    expect(() => broadcaster.broadcast(event)).toThrow(
      'Realtime broadcast target organization does not match event organization',
    );

    expect(realtimeService.getNamespace).not.toHaveBeenCalled();
  });

  it('should reject a user target belonging to another organization', () => {
    const { broadcaster, realtimeService } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.NOTIFICATION_CREATED,
      organizationId: 'org-1',
      payload: {
        notificationId: 'notification-1',
      },
      targets: [
        {
          type: 'user',
          organizationId: 'org-2',
          userId: 'user-1',
        },
      ],
    };

    expect(() => broadcaster.broadcast(event)).toThrow(
      'Realtime broadcast target organization does not match event organization',
    );

    expect(realtimeService.getNamespace).not.toHaveBeenCalled();
  });

  it('should route notification.created to the user room', () => {
    const { broadcaster, realtimeService } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.NOTIFICATION_CREATED,
      organizationId: 'org-1',
      payload: {
        notificationId: 'notification-1',
        organizationId: 'org-1',
        recipientId: 'user-1',
      },
      targets: [
        {
          type: 'user',
          organizationId: 'org-1',
          userId: 'user-1',
        },
      ],
    };

    broadcaster.broadcast(event);

    const namespace = realtimeService.getNamespace.mock.results[0].value;

    expect(namespace.to).toHaveBeenCalledWith(REALTIME_ROOMS.user('user-1'));
  });

  it('should reject a ticket target from another organization', () => {
    const { broadcaster, realtimeService } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.TICKET_UPDATED,
      organizationId: 'org-1',
      payload: {
        ticketId: 'ticket-1',
      },
      targets: [
        {
          type: 'ticket',
          organizationId: 'org-2',
          ticketId: 'ticket-1',
        },
      ],
    };

    expect(() => broadcaster.broadcast(event)).toThrow(
      'Realtime broadcast target organization does not match event organization',
    );

    expect(realtimeService.getNamespace).not.toHaveBeenCalled();
  });

  it('should reject an organization target from another organization', () => {
    const { broadcaster, realtimeService } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.TICKET_CREATED,
      organizationId: 'org-1',
      payload: {
        ticketId: 'ticket-1',
      },
      targets: [
        {
          type: 'organization',
          organizationId: 'org-2',
        },
      ],
    };

    expect(() => broadcaster.broadcast(event)).toThrow(
      'Realtime broadcast target organization does not match event organization',
    );

    expect(realtimeService.getNamespace).not.toHaveBeenCalled();
  });

  it('should reject the entire broadcast before emitting any target when one target crosses organizations', () => {
    const { broadcaster, realtimeService, emit } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.TICKET_UPDATED,
      organizationId: 'org-1',
      payload: {
        ticketId: 'ticket-1',
      },
      targets: [
        {
          type: 'organization',
          organizationId: 'org-1',
        },
        {
          type: 'ticket',
          organizationId: 'org-2',
          ticketId: 'ticket-1',
        },
      ],
    };

    expect(() => broadcaster.broadcast(event)).toThrow(
      'Realtime broadcast target organization does not match event organization',
    );

    expect(realtimeService.getNamespace).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('should reject a broadcast with an empty organization id', () => {
    const { broadcaster, realtimeService } = createBroadcaster();

    const event: RealtimeBroadcastEvent = {
      event: REALTIME_EVENTS.TICKET_CREATED,
      organizationId: '',
      payload: {
        ticketId: 'ticket-1',
      },
      targets: [
        {
          type: 'organization',
          organizationId: '',
        },
      ],
    };

    expect(() => broadcaster.broadcast(event)).toThrow();
    expect(realtimeService.getNamespace).not.toHaveBeenCalled();
  });
});
