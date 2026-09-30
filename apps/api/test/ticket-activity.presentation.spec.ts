import { TicketActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  getTicketActivityCategory,
  getTicketActivityTimeline,
  getTicketActivityDescription,
  getTicketActivityActorPresentation,
  TICKET_ACTIVITY_CATEGORIES,
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

  it('should expose the supported ticket activity categories', () => {
    expect(TICKET_ACTIVITY_CATEGORIES).toEqual([
      'TICKET',
      'WORKFLOW',
      'COMMUNICATION',
      'SLA',
      'APPROVAL',
    ]);
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

describe('Ticket activity descriptions', () => {
  it('describes ticket creation', () => {
    expect(
      getTicketActivityDescription(TicketActivityType.TICKET_CREATED, {
        ticketNumber: 'TKT-000001',
        priority: 'HIGH',
        type: 'INCIDENT',
      }),
    ).toBe('Ticket TKT-000001 was created');
  });

  it('describes ticket field updates', () => {
    expect(
      getTicketActivityDescription(TicketActivityType.TICKET_UPDATED, {
        title: {
          from: 'Old title',
          to: 'New title',
        },
      }),
    ).toBe(
      'Ticket details were updated: title from "Old title" to "New title"',
    );
  });

  it('describes status changes', () => {
    expect(
      getTicketActivityDescription(TicketActivityType.STATUS_CHANGED, {
        from: 'OPEN',
        to: 'IN_PROGRESS',
      }),
    ).toBe('Status changed from OPEN to IN_PROGRESS');
  });

  it('describes priority changes', () => {
    expect(
      getTicketActivityDescription(TicketActivityType.PRIORITY_CHANGED, {
        from: 'MEDIUM',
        to: 'HIGH',
      }),
    ).toBe('Priority changed from MEDIUM to HIGH');
  });

  it('describes assignment and team changes', () => {
    expect(
      getTicketActivityDescription(TicketActivityType.ASSIGNEE_CHANGED, {
        from: null,
        to: 'user-123',
      }),
    ).toBe('Assignee changed from unassigned to user-123');

    expect(
      getTicketActivityDescription(TicketActivityType.TEAM_CHANGED, {
        from: 'team-old',
        to: 'team-new',
      }),
    ).toBe('Team changed from team-old to team-new');
  });

  it('describes comment activities', () => {
    expect(
      getTicketActivityDescription(TicketActivityType.COMMENT_ADDED, {
        commentType: 'PUBLIC',
      }),
    ).toBe('Public comment added');

    expect(
      getTicketActivityDescription(TicketActivityType.COMMENT_UPDATED, {
        commentType: 'INTERNAL',
      }),
    ).toBe('Internal comment updated');

    expect(
      getTicketActivityDescription(TicketActivityType.COMMENT_DELETED, {
        commentType: 'PUBLIC',
      }),
    ).toBe('Public comment deleted');
  });

  it('describes SLA events', () => {
    expect(
      getTicketActivityDescription(
        TicketActivityType.SLA_FIRST_RESPONSE_BREACHED,
        {},
      ),
    ).toBe('First response SLA breached');

    expect(
      getTicketActivityDescription(
        TicketActivityType.SLA_RESOLUTION_BREACHED,
        {},
      ),
    ).toBe('Resolution SLA breached');
  });

  it('describes approval events', () => {
    expect(
      getTicketActivityDescription(TicketActivityType.APPROVAL_REQUESTED, {}),
    ).toBe('Approval requested');

    expect(
      getTicketActivityDescription(TicketActivityType.APPROVAL_APPROVED, {}),
    ).toBe('Approval approved');

    expect(
      getTicketActivityDescription(TicketActivityType.APPROVAL_REJECTED, {}),
    ).toBe('Approval rejected');

    expect(
      getTicketActivityDescription(TicketActivityType.APPROVAL_CANCELLED, {}),
    ).toBe('Approval cancelled');
  });
});

describe('Ticket activity actor presentation', () => {
  it('should present a user actor using name, email, and id', () => {
    expect(
      getTicketActivityActorPresentation({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      }),
    ).toEqual({
      displayName: 'John Doe',
      email: 'john@example.com',
      userId: 'user-123',
    });
  });

  it('should return null for system activities without an actor', () => {
    expect(getTicketActivityActorPresentation(null)).toBeNull();
  });

  it('should return null actor presentation for system-generated activity', () => {
    expect(getTicketActivityActorPresentation(null)).toBeNull();
  });

  it('should return actor presentation for user-generated activity', () => {
    expect(
      getTicketActivityActorPresentation({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      }),
    ).toEqual({
      userId: 'user-1',
      displayName: 'Test User',
      email: 'test@example.com',
    });
  });
});
