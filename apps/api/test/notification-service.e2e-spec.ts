import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NOTIFICATION_EVENTS } from '../src/modules/notifications/notification-events';
import { NotificationService } from '../src/modules/notifications/notification.service';

describe('NotificationService', () => {
  let module: TestingModule;
  let notificationService: NotificationService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [NotificationService],
    }).compile();

    notificationService = module.get(NotificationService);
    eventEmitter = module.get(EventEmitter2);

    vi.spyOn(eventEmitter, 'emit');
  });

  it('should create and emit notification.created', () => {
    const notification = notificationService.createNotification({
      organizationId: 'org-1',
      recipientId: 'user-2',
      actorId: 'user-1',
      type: 'TICKET_STATUS_CHANGED',
      title: 'Ticket status changed',
      message: 'Ticket TKT-000001 is now resolved.',
    });

    expect(notification.notificationId).toBeDefined();
    expect(notification.organizationId).toBe('org-1');
    expect(notification.recipientId).toBe('user-2');
    expect(notification.actorId).toBe('user-1');
    expect(notification.type).toBe('TICKET_STATUS_CHANGED');
    expect(notification.title).toBe('Ticket status changed');
    expect(notification.message).toBe('Ticket TKT-000001 is now resolved.');
    expect(notification.createdAt).toBeInstanceOf(Date);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.CREATED,
      notification,
    );
  });

  it('should preserve notification recipient and organization boundaries', () => {
    const notification = notificationService.createNotification({
      organizationId: 'org-42',
      recipientId: 'user-99',
      actorId: 'user-10',
      type: 'SLA_BREACHED',
      title: 'SLA breached',
      message: 'Ticket TKT-000042 has breached its SLA.',
    });

    expect(notification).toEqual(
      expect.objectContaining({
        organizationId: 'org-42',
        recipientId: 'user-99',
        actorId: 'user-10',
        type: 'SLA_BREACHED',
      }),
    );
  });
});
