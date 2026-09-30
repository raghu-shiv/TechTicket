import { TicketActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  getTicketActivityCategory,
  getTicketActivityTimeline,
} from '../src/modules/tickets/ticket-activity.presentation.js';

describe('Ticket activity categorization', () => {
  it('categorizes ticket activities as TICKET', () => {
    expect(getTicketActivityCategory(TicketActivityType.TICKET_CREATED)).toBe(
      'TICKET',
    );

    expect(getTicketActivityCategory(TicketActivityType.TICKET_UPDATED)).toBe(
      'TICKET',
    );

    expect(getTicketActivityCategory(TicketActivityType.PRIORITY_CHANGED)).toBe(
      'TICKET',
    );
  });

  it('categorizes workflow activities as WORKFLOW', () => {
    expect(getTicketActivityCategory(TicketActivityType.STATUS_CHANGED)).toBe(
      'WORKFLOW',
    );

    expect(getTicketActivityCategory(TicketActivityType.ASSIGNEE_CHANGED)).toBe(
      'WORKFLOW',
    );

    expect(getTicketActivityCategory(TicketActivityType.TEAM_CHANGED)).toBe(
      'WORKFLOW',
    );
  });

  it('categorizes communication activities as COMMUNICATION', () => {
    expect(getTicketActivityCategory(TicketActivityType.COMMENT_ADDED)).toBe(
      'COMMUNICATION',
    );

    expect(getTicketActivityCategory(TicketActivityType.COMMENT_UPDATED)).toBe(
      'COMMUNICATION',
    );

    expect(getTicketActivityCategory(TicketActivityType.COMMENT_DELETED)).toBe(
      'COMMUNICATION',
    );
  });

  it('categorizes SLA activities as SLA', () => {
    expect(
      getTicketActivityCategory(TicketActivityType.SLA_FIRST_RESPONSE_BREACHED),
    ).toBe('SLA');

    expect(
      getTicketActivityCategory(TicketActivityType.SLA_RESOLUTION_BREACHED),
    ).toBe('SLA');
  });

  it('categorizes approval activities as APPROVAL', () => {
    expect(
      getTicketActivityCategory(TicketActivityType.APPROVAL_REQUESTED),
    ).toBe('APPROVAL');

    expect(
      getTicketActivityCategory(TicketActivityType.APPROVAL_APPROVED),
    ).toBe('APPROVAL');

    expect(
      getTicketActivityCategory(TicketActivityType.APPROVAL_REJECTED),
    ).toBe('APPROVAL');

    expect(
      getTicketActivityCategory(TicketActivityType.APPROVAL_CANCELLED),
    ).toBe('APPROVAL');
  });
});

describe('Ticket activity timeline metadata', () => {
  it('should derive stable timeline metadata from createdAt', () => {
    const createdAt = new Date('2026-09-30T09:30:15.421Z');

    expect(getTicketActivityTimeline(createdAt)).toEqual({
      timestamp: '2026-09-30T09:30:15.421Z',
      date: '2026-09-30',
      time: '09:30:15',
    });
  });

  it('should preserve the canonical activity timestamp', () => {
    const createdAt = new Date('2026-01-15T22:05:09.999Z');

    const timeline = getTicketActivityTimeline(createdAt);

    expect(timeline.timestamp).toBe(createdAt.toISOString());
  });
});
