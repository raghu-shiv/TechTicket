import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  NOTIFICATION_EVENTS,
  type NotificationCreatedEvent,
  type NotificationUpdatedEvent,
} from '../notifications/notification-events';

import type { RealtimeBroadcastTarget } from './realtime-event.types';
import { RealtimeEventBroadcaster } from './realtime-event.broadcaster';
import { REALTIME_EVENTS } from './realtime.types';

@Injectable()
export class RealtimeNotificationEventsService {
  constructor(
    private readonly realtimeEventBroadcaster: RealtimeEventBroadcaster,
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.CREATED)
  handleNotificationCreated(event: NotificationCreatedEvent): void {
    this.broadcastToRecipient(
      event.organizationId,
      event.recipientId,
      {
        ...event,
      },
      REALTIME_EVENTS.NOTIFICATION_CREATED,
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.UPDATED)
  handleNotificationUpdated(event: NotificationUpdatedEvent): void {
    this.broadcastToRecipient(
      event.organizationId,
      event.recipientId,
      {
        ...event,
      },
      REALTIME_EVENTS.NOTIFICATION_UPDATED,
    );
  }

  private broadcastToRecipient(
    organizationId: string,
    recipientId: string,
    payload: NotificationCreatedEvent | NotificationUpdatedEvent,
    realtimeEvent:
      | typeof REALTIME_EVENTS.NOTIFICATION_CREATED
      | typeof REALTIME_EVENTS.NOTIFICATION_UPDATED,
  ): void {
    const targets: RealtimeBroadcastTarget[] = [
      {
        type: 'organization-user',
        organizationId,
        userId: recipientId,
      },
    ];

    this.realtimeEventBroadcaster.broadcast({
      event: realtimeEvent,
      organizationId,
      payload,
      targets,
    });
  }
}
