import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import type { RealtimeBroadcastTarget } from './realtime-event.types';
import { RealtimeEventBroadcaster } from './realtime-event.broadcaster';
import { REALTIME_EVENTS } from './realtime.types';

import {
  NOTIFICATION_EVENTS,
  type NotificationCreatedEvent,
} from '../notifications/notification-events';

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
