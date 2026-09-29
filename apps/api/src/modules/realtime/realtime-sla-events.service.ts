import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { TICKET_EVENTS } from '../tickets/ticket-events';
import type { RealtimeBroadcastTarget } from './realtime-event.types';
import { RealtimeEventBroadcaster } from './realtime-event.broadcaster';
import { REALTIME_EVENTS } from './realtime.types';

interface SlaBreachEvent {
  escalationId: string;
  ticketId: string;
  ticketSlaId: string;
  type: string;
  organizationId: string;
  occurredAt: Date;
}

@Injectable()
export class RealtimeSlaEventsService {
  constructor(
    private readonly realtimeEventBroadcaster: RealtimeEventBroadcaster,
  ) {}

  @OnEvent(TICKET_EVENTS.SLA_FIRST_RESPONSE_BREACHED)
  handleFirstResponseBreach(event: SlaBreachEvent): void {
    this.broadcastSlaEvent(REALTIME_EVENTS.SLA_FIRST_RESPONSE_BREACHED, event);
  }

  @OnEvent(TICKET_EVENTS.SLA_RESOLUTION_BREACHED)
  handleResolutionBreach(event: SlaBreachEvent): void {
    this.broadcastSlaEvent(REALTIME_EVENTS.SLA_RESOLUTION_BREACHED, event);
  }

  private broadcastSlaEvent(
    realtimeEvent:
      | typeof REALTIME_EVENTS.SLA_FIRST_RESPONSE_BREACHED
      | typeof REALTIME_EVENTS.SLA_RESOLUTION_BREACHED,
    event: SlaBreachEvent,
  ): void {
    const targets: RealtimeBroadcastTarget[] = [
      {
        type: 'organization',
        organizationId: event.organizationId,
      },
      {
        type: 'ticket',
        organizationId: event.organizationId,
        ticketId: event.ticketId,
      },
    ];

    this.realtimeEventBroadcaster.broadcast({
      event: realtimeEvent,
      organizationId: event.organizationId,
      payload: event,
      targets,
    });
  }
}
