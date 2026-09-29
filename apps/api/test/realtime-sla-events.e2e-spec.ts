import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TICKET_EVENTS } from '../src/modules/tickets/ticket-events';
import { RealtimeEventBroadcaster } from '../src/modules/realtime/realtime-event.broadcaster';
import { RealtimeSlaEventsService } from '../src/modules/realtime/realtime-sla-events.service';
import { REALTIME_EVENTS } from '../src/modules/realtime/realtime.types';

describe('RealtimeSlaEventsService', () => {
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
        RealtimeSlaEventsService,
        {
          provide: RealtimeEventBroadcaster,
          useValue: broadcaster,
        },
      ],
    }).compile();

    await module.init();

    eventEmitter = module.get(EventEmitter2);
  });

  it('should broadcast a first-response SLA breach to organization and ticket rooms', async () => {
    const event = {
      escalationId: 'escalation-1',
      ticketId: 'ticket-1',
      ticketSlaId: 'ticket-sla-1',
      type: 'FIRST_RESPONSE_BREACH',
      organizationId: 'org-1',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.SLA_FIRST_RESPONSE_BREACHED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.SLA_FIRST_RESPONSE_BREACHED,
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
      ],
    });
  });

  it('should broadcast a resolution SLA breach to organization and ticket rooms', async () => {
    const event = {
      escalationId: 'escalation-2',
      ticketId: 'ticket-1',
      ticketSlaId: 'ticket-sla-1',
      type: 'RESOLUTION_BREACH',
      organizationId: 'org-1',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.SLA_RESOLUTION_BREACHED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: REALTIME_EVENTS.SLA_RESOLUTION_BREACHED,
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
      ],
    });
  });

  it('should preserve the SLA event organization on every broadcast target', async () => {
    const event = {
      escalationId: 'escalation-3',
      ticketId: 'ticket-2',
      ticketSlaId: 'ticket-sla-2',
      type: 'FIRST_RESPONSE_BREACH',
      organizationId: 'org-99',
      occurredAt: new Date(),
    };

    eventEmitter.emit(TICKET_EVENTS.SLA_FIRST_RESPONSE_BREACHED, event);

    await new Promise((resolve) => setImmediate(resolve));

    expect(broadcaster.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-99',
        targets: [
          {
            type: 'organization',
            organizationId: 'org-99',
          },
          {
            type: 'ticket',
            organizationId: 'org-99',
            ticketId: 'ticket-2',
          },
        ],
      }),
    );
  });
});
