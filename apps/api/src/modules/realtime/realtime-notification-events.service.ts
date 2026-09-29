import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import type { RealtimeBroadcastTarget } from './realtime-event.types';
import { RealtimeEventBroadcaster } from './realtime-event.broadcaster';
import { REALTIME_EVENTS } from './realtime.types';

export const NOTIFICATION_EVENTS = {
  CREATED: 'notification.created',
} as const;

interface NotificationCreatedEvent {
  notificationId: string;
  organizationId: string;
  recipientId: string;
  actorId: string;
  type: string;
  title: string;
  message: string;
  createdAt: Date;
}

@Injectable()
export class RealtimeNotificationEventsService {
  constructor(
    private readonly realtimeEventBroadcaster: RealtimeEventBroadcaster,
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.CREATED)
  handleNotificationCreated(event: NotificationCreatedEvent): void {
    const targets: RealtimeBroadcastTarget[] = [
      {
        type: 'organization',
        organizationId: event.organizationId,
      },
      {
        type: 'user',
        organizationId: event.organizationId,
        userId: event.recipientId,
      },
    ];

    this.realtimeEventBroadcaster.broadcast({
      event: REALTIME_EVENTS.NOTIFICATION_CREATED,
      organizationId: event.organizationId,
      payload: event,
      targets,
    });
  }
}
