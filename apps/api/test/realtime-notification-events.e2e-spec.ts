import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NOTIFICATION_EVENTS } from '../src/modules/notifications/notification-events';
import { RealtimeEventBroadcaster } from '../src/modules/realtime/realtime-event.broadcaster';
import { RealtimeNotificationEventsService } from '../src/modules/realtime/realtime-notification-events.service';
import { REALTIME_EVENTS } from '../src/modules/realtime/realtime.types';

describe('RealtimeNotificationEventsService', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;

  let broadcaster: {
    broadcast: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    broadcaster = {
      broadcast: vi.fn(),
    };

    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        RealtimeNotificationEventsService,
        {
          provide: RealtimeEventBroadcaster,
          useValue: broadcaster,
        },
      ],
    }).compile();

    await module.init();

    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(async () => {
    await module?.close();
  });

  it('should broadcast a notification-created event to the organization-scoped recipient', async () => {
    const event = {
      notificationId: 'notification-1',
      organizationId: 'org-1',
      recipientId: 'user-2',
      actorId: 'user-1',
      type: 'TICKET_STATUS_CHANGED',
      title: 'Ticket status changed',
      message: 'Ticket TKT-000001 is now resolved.',
      createdAt: new Date(),
    };

    eventEmitter.emit(NOTIFICATION_EVENTS.CREATED, event);

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledTimes(1);
    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.NOTIFICATION_CREATED,
      organizationId: 'org-1',
      payload: event,
      targets: [
        {
          type: 'organization-user',
          organizationId: 'org-1',
          userId: 'user-2',
        },
      ],
    });
  });

  it('should preserve organization scoping on the notification broadcast', async () => {
    const event = {
      notificationId: 'notification-2',
      organizationId: 'org-99',
      recipientId: 'user-77',
      actorId: 'user-55',
      type: 'APPROVAL_APPROVED',
      title: 'Approval approved',
      message: 'Your approval request was approved.',
      createdAt: new Date(),
    };

    eventEmitter.emit(NOTIFICATION_EVENTS.CREATED, event);

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        event: REALTIME_EVENTS.NOTIFICATION_CREATED,
        organizationId: 'org-99',
        payload: event,
        targets: [
          {
            type: 'organization-user',
            organizationId: 'org-99',
            userId: 'user-77',
          },
        ],
      }),
    );
  });

  it('should never create a notification realtime target outside the event organization', async () => {
    const event = {
      notificationId: 'notification-3',
      organizationId: 'org-42',
      recipientId: 'user-99',
      actorId: 'user-10',
      type: 'SLA_BREACHED',
      title: 'SLA breached',
      message: 'Ticket TKT-000042 has breached its SLA.',
      createdAt: new Date(),
    };

    eventEmitter.emit(NOTIFICATION_EVENTS.CREATED, event);

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledTimes(1);

    const broadcast = broadcaster.broadcast.mock.calls[0][0];

    expect(broadcast.organizationId).toBe('org-42');
    expect(broadcast.event).toBe(REALTIME_EVENTS.NOTIFICATION_CREATED);

    expect(broadcast.targets).toHaveLength(1);
    expect(
      broadcast.targets.every(
        (target: { organizationId: string }) =>
          target.organizationId === event.organizationId,
      ),
    ).toBe(true);

    expect(broadcast.targets).toContainEqual({
      type: 'organization-user',
      organizationId: 'org-42',
      userId: 'user-99',
    });
  });
});
