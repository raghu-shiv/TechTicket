import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../src/database/database.service';
import { NOTIFICATION_EVENTS } from '../src/modules/notifications/notification-events';
import { NotificationService } from '../src/modules/notifications/notification.service';

describe('NotificationService', () => {
  let module: TestingModule;
  let notificationService: NotificationService;
  let eventEmitter: EventEmitter2;

  const persistedAt = new Date('2026-10-15T04:00:00.000Z');

  const databaseMock = {
    notification: {
      create: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    databaseMock.membership.findUnique.mockImplementation(
      async ({
        where,
      }: {
        where: {
          userId_organizationId?: {
            userId: string;
            organizationId: string;
          };
        };
      }) => {
        const key = where.userId_organizationId;

        if (!key) {
          return null;
        }

        return {
          id: `membership-${key.userId}`,
          userId: key.userId,
          organizationId: key.organizationId,
          role: 'REQUESTER',
        };
      },
    );

    databaseMock.notification.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        id: 'notification-db-1',
        createdAt: persistedAt,
        readAt: null,
      }),
    );

    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        NotificationService,
        {
          provide: DatabaseService,
          useValue: databaseMock,
        },
      ],
    }).compile();

    notificationService = module.get(NotificationService);
    eventEmitter = module.get(EventEmitter2);

    vi.spyOn(eventEmitter, 'emit');
  });

  afterEach(async () => {
    await module?.close();
  });

  it('should persist and emit notification.created', async () => {
    const notification = await notificationService.createNotification({
      organizationId: 'org-1',
      recipientId: 'user-2',
      actorId: 'user-1',
      type: 'TICKET_STATUS_CHANGED',
      title: 'Ticket status changed',
      message: 'Ticket TKT-000001 is now resolved.',
    });

    expect(notification).toBeTruthy();

    if (!notification) {
      throw new Error('Expected the notification to be created.');
    }

    // The service checks both the recipient and the actor.
    expect(databaseMock.membership.findUnique).toHaveBeenCalledTimes(2);

    expect(databaseMock.membership.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        userId_organizationId: {
          userId: 'user-2',
          organizationId: 'org-1',
        },
      },
      select: {
        userId: true,
      },
    });

    expect(databaseMock.membership.findUnique).toHaveBeenNthCalledWith(2, {
      where: {
        userId_organizationId: {
          userId: 'user-1',
          organizationId: 'org-1',
        },
      },
      select: {
        userId: true,
      },
    });

    expect(databaseMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          recipientId: 'user-2',
          actorId: 'user-1',
          type: 'TICKET_STATUS_CHANGED',
          title: 'Ticket status changed',
          message: 'Ticket TKT-000001 is now resolved.',
        }),
      }),
    );

    expect(notification).toEqual(
      expect.objectContaining({
        notificationId: 'notification-db-1',
        organizationId: 'org-1',
        recipientId: 'user-2',
        actorId: 'user-1',
        type: 'TICKET_STATUS_CHANGED',
        title: 'Ticket status changed',
        message: 'Ticket TKT-000001 is now resolved.',
        createdAt: persistedAt,
      }),
    );

    expect(notification.createdAt).toBeInstanceOf(Date);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.CREATED,
      notification,
    );

    // Ensure the database insert happened before event emission.
    expect(
      databaseMock.notification.create.mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(eventEmitter.emit).mock.invocationCallOrder[0]);
  });

  it('should preserve notification recipient and organization boundaries', async () => {
    const notification = await notificationService.createNotification({
      organizationId: 'org-42',
      recipientId: 'user-99',
      actorId: 'user-10',
      type: 'SLA_BREACHED',
      title: 'SLA breached',
      message: 'Ticket TKT-000042 has breached its SLA.',
    });

    expect(notification).toBeTruthy();

    if (!notification) {
      throw new Error('Expected the notification to be created.');
    }

    expect(databaseMock.membership.findUnique).toHaveBeenCalledTimes(2);

    expect(databaseMock.membership.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        userId_organizationId: {
          userId: 'user-99',
          organizationId: 'org-42',
        },
      },
      select: {
        userId: true,
      },
    });

    expect(databaseMock.membership.findUnique).toHaveBeenNthCalledWith(2, {
      where: {
        userId_organizationId: {
          userId: 'user-10',
          organizationId: 'org-42',
        },
      },
      select: {
        userId: true,
      },
    });

    expect(databaseMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-42',
          recipientId: 'user-99',
          actorId: 'user-10',
          type: 'SLA_BREACHED',
        }),
      }),
    );

    expect(notification).toEqual(
      expect.objectContaining({
        notificationId: 'notification-db-1',
        organizationId: 'org-42',
        recipientId: 'user-99',
        actorId: 'user-10',
        type: 'SLA_BREACHED',
      }),
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.CREATED,
      notification,
    );
  });
});
