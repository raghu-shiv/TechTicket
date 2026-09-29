import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  APPROVAL_EVENTS,
  type ApprovalActivityEvent,
} from '../approvals/approval-events';
import type { RealtimeBroadcastTarget } from './realtime-event.types';
import { RealtimeEventBroadcaster } from './realtime-event.broadcaster';
import { REALTIME_EVENTS } from './realtime.types';

@Injectable()
export class RealtimeApprovalEventsService {
  constructor(
    private readonly realtimeEventBroadcaster: RealtimeEventBroadcaster,
  ) {}

  @OnEvent(APPROVAL_EVENTS.REQUESTED)
  handleApprovalRequested(event: ApprovalActivityEvent): void {
    this.broadcastApprovalEvent(REALTIME_EVENTS.APPROVAL_REQUESTED, event);
  }

  @OnEvent(APPROVAL_EVENTS.APPROVED)
  handleApprovalApproved(event: ApprovalActivityEvent): void {
    this.broadcastApprovalEvent(REALTIME_EVENTS.APPROVAL_APPROVED, event);
  }

  @OnEvent(APPROVAL_EVENTS.REJECTED)
  handleApprovalRejected(event: ApprovalActivityEvent): void {
    this.broadcastApprovalEvent(REALTIME_EVENTS.APPROVAL_REJECTED, event);
  }

  @OnEvent(APPROVAL_EVENTS.CANCELLED)
  handleApprovalCancelled(event: ApprovalActivityEvent): void {
    this.broadcastApprovalEvent(REALTIME_EVENTS.APPROVAL_CANCELLED, event);
  }

  private broadcastApprovalEvent(
    realtimeEvent:
      | typeof REALTIME_EVENTS.APPROVAL_REQUESTED
      | typeof REALTIME_EVENTS.APPROVAL_APPROVED
      | typeof REALTIME_EVENTS.APPROVAL_REJECTED
      | typeof REALTIME_EVENTS.APPROVAL_CANCELLED,
    event: ApprovalActivityEvent,
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
      {
        type: 'user',
        organizationId: event.organizationId,
        userId: event.requesterId,
      },
      {
        type: 'user',
        organizationId: event.organizationId,
        userId: event.approverId,
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
