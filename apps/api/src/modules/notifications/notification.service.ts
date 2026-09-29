import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';

import {
  NOTIFICATION_EVENTS,
  type NotificationCreatedEvent,
  type NotificationType,
} from './notification-events';

export interface CreateNotificationInput {
  organizationId: string;
  recipientId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  message: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  createNotification(input: CreateNotificationInput): NotificationCreatedEvent {
    const notification: NotificationCreatedEvent = {
      notificationId: randomUUID(),
      organizationId: input.organizationId,
      recipientId: input.recipientId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      message: input.message,
      createdAt: new Date(),
    };

    this.eventEmitter.emit(NOTIFICATION_EVENTS.CREATED, notification);

    return notification;
  }
}
