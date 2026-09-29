import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { APPROVAL_EVENTS } from '../src/modules/approvals/approval-events';
import { RealtimeApprovalEventsService } from '../src/modules/realtime/realtime-approval-events.service';
import { RealtimeEventBroadcaster } from '../src/modules/realtime/realtime-event.broadcaster';
import { REALTIME_EVENTS } from '../src/modules/realtime/realtime.types';

describe('RealtimeApprovalEventsService', () => {
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
        RealtimeApprovalEventsService,
        {
          provide: RealtimeEventBroadcaster,
          useValue: broadcaster,
        },
      ],
    }).compile();

    await module.init();

    eventEmitter = module.get(EventEmitter2);
  });

  it('should broadcast approval.requested to organization, ticket, requester, and approver rooms', async () => {
    const event = {
      approvalId: 'approval-1',
      ticketId: 'ticket-1',
      ticketNumber: 'TKT-000001',
      organizationId: 'org-1',
      actorId: 'user-1',
      requesterId: 'user-1',
      approverId: 'user-2',
      status: 'PENDING' as const,
      comment: null,
      occurredAt: new Date(),
    };

    eventEmitter.emit(APPROVAL_EVENTS.REQUESTED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.APPROVAL_REQUESTED,
      organizationId: 'org-1',
      payload: event,
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
        {
          type: 'user',
          organizationId: 'org-1',
          userId: 'user-2',
        },
      ],
    });
  });

  it('should broadcast approval.approved to organization, ticket, requester, and approver rooms', async () => {
    const event = {
      approvalId: 'approval-1',
      ticketId: 'ticket-1',
      ticketNumber: 'TKT-000001',
      organizationId: 'org-1',
      actorId: 'user-2',
      requesterId: 'user-1',
      approverId: 'user-2',
      status: 'APPROVED' as const,
      comment: 'Approved',
      occurredAt: new Date(),
    };

    eventEmitter.emit(APPROVAL_EVENTS.APPROVED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.APPROVAL_APPROVED,
      organizationId: 'org-1',
      payload: event,
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
        {
          type: 'user',
          organizationId: 'org-1',
          userId: 'user-2',
        },
      ],
    });
  });

  it('should broadcast approval.rejected to organization, ticket, requester, and approver rooms', async () => {
    const event = {
      approvalId: 'approval-1',
      ticketId: 'ticket-1',
      ticketNumber: 'TKT-000001',
      organizationId: 'org-1',
      actorId: 'user-2',
      requesterId: 'user-1',
      approverId: 'user-2',
      status: 'REJECTED' as const,
      comment: 'Needs more information',
      occurredAt: new Date(),
    };

    eventEmitter.emit(APPROVAL_EVENTS.REJECTED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.APPROVAL_REJECTED,
      organizationId: 'org-1',
      payload: event,
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
        {
          type: 'user',
          organizationId: 'org-1',
          userId: 'user-2',
        },
      ],
    });
  });

  it('should broadcast approval.cancelled to organization, ticket, requester, and approver rooms', async () => {
    const event = {
      approvalId: 'approval-1',
      ticketId: 'ticket-1',
      ticketNumber: 'TKT-000001',
      organizationId: 'org-1',
      actorId: 'user-1',
      requesterId: 'user-1',
      approverId: 'user-2',
      status: 'CANCELLED' as const,
      comment: 'No longer required',
      occurredAt: new Date(),
    };

    eventEmitter.emit(APPROVAL_EVENTS.CANCELLED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.APPROVAL_CANCELLED,
      organizationId: 'org-1',
      payload: event,
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
        {
          type: 'user',
          organizationId: 'org-1',
          userId: 'user-2',
        },
      ],
    });
  });
});
