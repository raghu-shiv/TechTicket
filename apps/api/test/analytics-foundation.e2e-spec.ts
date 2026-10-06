import type { INestApplication } from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';

import { createTestApp } from './helpers/app.helper.js';

import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

interface AnalyticsTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  team: {
    id: string;
    name: string | null;
  } | null;
  assignee: {
    id: string;
    name: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsResponse {
  data: {
    total: number;
    tickets: AnalyticsTicket[];
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    query: {
      dataSource: 'tickets';
      organizationScoped: true;
      queryVersion: 1;
      dateField: 'createdAt' | 'updatedAt';
      dateFrom: string | null;
      dateTo: string | null;
      dimensions: {
        status: string | null;
        priority: string | null;
        type: string | null;
        teamId: string | null;
        assigneeId: string | null;
        requesterId: string | null;
        unassigned: boolean | null;
        unassignedTeam: boolean | null;
      };
    };
  };
}

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';

type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

type TicketType = 'INCIDENT' | 'SERVICE_REQUEST' | 'QUESTION' | 'PROBLEM';

interface CreateTicketInput {
  title: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  teamId?: string | null;
  assigneeId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

describe('Analytics Foundation API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;
  let analyticsTeamId: string;

  const createdTicketIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);

    fixture = await createOrganizationTestFixture(app);

    const analyticsTeam = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `Analytics Foundation Team ${randomUUID().slice(0, 8)}`,
        description: 'Dedicated team for Analytics Foundation E2E tests.',
      },
      select: {
        id: true,
      },
    });

    analyticsTeamId = analyticsTeam.id;
  });

  afterEach(async () => {
    if (createdTicketIds.length === 0) {
      return;
    }

    await database.ticket.deleteMany({
      where: {
        id: {
          in: createdTicketIds,
        },
      },
    });

    createdTicketIds.length = 0;
  });

  afterAll(async () => {
    await database.organization.delete({
      where: {
        id: fixture.organization.id,
      },
    });

    await database.user.deleteMany({
      where: {
        id: {
          in: [
            fixture.owner.userId,
            fixture.admin.userId,
            fixture.agent.userId,
            fixture.requester.userId,
          ],
        },
      },
    });

    await app.close();
  });

  /**
   * IMPORTANT:
   * Use the authenticated fixture agent.
   *
   * The analytics controller is protected by AuthGuard and
   * OrganizationGuard. A fresh request(app.getHttpServer())
   * has no authentication cookie and therefore receives 401.
   *
   * The organization helper creates authenticated agents for
   * owner/admin/agent/requester and exposes them through fixture.
   */
  function analyticsRequest() {
    return fixture.owner.agent
      .get('/api/v1/reports/analytics/foundation')
      .set('x-organization-id', fixture.organization.id);
  }

  async function createTicket(input: CreateTicketInput) {
    const ticket = await database.ticket.create({
      data: {
        organizationId: fixture.organization.id,
        requesterId: fixture.requester.userId,
        ticketNumber: `AN-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: input.title,
        description: `Analytics foundation test ticket: ${input.title}`,
        status: input.status ?? 'OPEN',
        priority: input.priority ?? 'MEDIUM',
        type: input.type ?? 'INCIDENT',
        teamId: input.teamId ?? null,
        assigneeId: input.assigneeId ?? null,
        createdAt: input.createdAt ?? new Date(),
        updatedAt: input.updatedAt ?? new Date(),
      },
    });

    createdTicketIds.push(ticket.id);

    return ticket;
  }

  async function getAnalytics(
    query: Record<string, string | number | boolean | undefined> = {},
  ) {
    return analyticsRequest().query(query).expect(200);
  }

  function getTicketIds(response: { body: AnalyticsResponse }): string[] {
    return response.body.data.tickets.map((ticket) => ticket.id);
  }

  it('should return the analytics foundation contract', async () => {
    const ticket = await createTicket({
      title: 'Analytics foundation contract ticket',
    });

    const response = await getAnalytics();

    const body = response.body as AnalyticsResponse;

    expect(body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          total: expect.any(Number),
          tickets: expect.any(Array),
        }),
        meta: expect.objectContaining({
          page: 1,
          limit: 25,
          total: expect.any(Number),
          totalPages: expect.any(Number),
          query: expect.objectContaining({
            dataSource: 'tickets',
            organizationScoped: true,
            queryVersion: 1,
            dateField: 'createdAt',
            dateFrom: null,
            dateTo: null,
          }),
        }),
      }),
    );

    expect(body.data.tickets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
        }),
      ]),
    );
  });

  it('should default to createdAt as the date field', async () => {
    const response = await getAnalytics();

    const body = response.body as AnalyticsResponse;

    expect(body.meta.query.dateField).toBe('createdAt');
  });

  it('should support the updatedAt date field', async () => {
    const inside = await createTicket({
      title: 'Updated date inside',
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      updatedAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    const outside = await createTicket({
      title: 'Updated date outside',
      createdAt: new Date('2026-10-05T10:00:00.000Z'),
      updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    });

    const response = await getAnalytics({
      dateField: 'updatedAt',
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-06T23:59:59.999Z',
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(inside.id);
    expect(ids).not.toContain(outside.id);

    const body = response.body as AnalyticsResponse;

    expect(body.meta.query.dateField).toBe('updatedAt');
  });

  it('should apply status filtering', async () => {
    const openTicket = await createTicket({
      title: 'Open status ticket',
      status: 'OPEN',
    });

    const resolvedTicket = await createTicket({
      title: 'Resolved status ticket',
      status: 'RESOLVED',
    });

    const response = await getAnalytics({
      status: 'RESOLVED',
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(resolvedTicket.id);
    expect(ids).not.toContain(openTicket.id);
    expect(response.body.meta.query.dimensions.status).toBe('RESOLVED');
  });

  it('should apply priority filtering', async () => {
    const highTicket = await createTicket({
      title: 'High priority ticket',
      priority: 'HIGH',
    });

    const lowTicket = await createTicket({
      title: 'Low priority ticket',
      priority: 'LOW',
    });

    const response = await getAnalytics({
      priority: 'HIGH',
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(highTicket.id);
    expect(ids).not.toContain(lowTicket.id);
    expect(response.body.meta.query.dimensions.priority).toBe('HIGH');
  });

  it('should apply type filtering', async () => {
    const problemTicket = await createTicket({
      title: 'Problem type ticket',
      type: 'PROBLEM',
    });

    const incidentTicket = await createTicket({
      title: 'Incident type ticket',
      type: 'INCIDENT',
    });

    const response = await getAnalytics({
      type: 'PROBLEM',
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(problemTicket.id);
    expect(ids).not.toContain(incidentTicket.id);
    expect(response.body.meta.query.dimensions.type).toBe('PROBLEM');
  });

  it('should apply assignee filtering', async () => {
    const assigned = await createTicket({
      title: 'Assigned analytics ticket',
      assigneeId: fixture.agent.userId,
    });

    const unassigned = await createTicket({
      title: 'Unassigned analytics ticket',
      assigneeId: null,
    });

    const response = await getAnalytics({
      assigneeId: fixture.agent.userId,
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(assigned.id);
    expect(ids).not.toContain(unassigned.id);

    expect(response.body.meta.query.dimensions.assigneeId).toBe(
      fixture.agent.userId,
    );
  });

  it('should apply unassigned=true filtering', async () => {
    const assigned = await createTicket({
      title: 'Assigned ticket',
      assigneeId: fixture.agent.userId,
    });

    const unassigned = await createTicket({
      title: 'Unassigned ticket',
      assigneeId: null,
    });

    const response = await getAnalytics({
      unassigned: true,
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(unassigned.id);
    expect(ids).not.toContain(assigned.id);

    expect(response.body.meta.query.dimensions.unassigned).toBe(true);
  });

  it('should apply unassigned=false filtering', async () => {
    const assigned = await createTicket({
      title: 'Assigned false-filter ticket',
      assigneeId: fixture.agent.userId,
    });

    const unassigned = await createTicket({
      title: 'Unassigned false-filter ticket',
      assigneeId: null,
    });

    const response = await getAnalytics({
      unassigned: false,
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(assigned.id);
    expect(ids).not.toContain(unassigned.id);

    expect(response.body.meta.query.dimensions.unassigned).toBe(false);
  });

  it('should apply team filtering', async () => {
    const teamTicket = await createTicket({
      title: 'Team analytics ticket',
      teamId: analyticsTeamId,
    });

    const noTeamTicket = await createTicket({
      title: 'No team analytics ticket',
      teamId: null,
    });

    const response = await getAnalytics({
      teamId: analyticsTeamId,
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(teamTicket.id);
    expect(ids).not.toContain(noTeamTicket.id);

    expect(response.body.meta.query.dimensions.teamId).toBe(analyticsTeamId);
  });

  it('should apply unassignedTeam=true filtering', async () => {
    const teamTicket = await createTicket({
      title: 'Assigned team ticket',
      teamId: analyticsTeamId,
    });

    const unassignedTeamTicket = await createTicket({
      title: 'Unassigned team ticket',
      teamId: null,
    });

    const response = await getAnalytics({
      unassignedTeam: true,
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(unassignedTeamTicket.id);
    expect(ids).not.toContain(teamTicket.id);

    expect(response.body.meta.query.dimensions.unassignedTeam).toBe(true);
  });

  it('should apply requester filtering', async () => {
    const ticket = await createTicket({
      title: 'Requester analytics ticket',
    });

    const response = await getAnalytics({
      requesterId: fixture.requester.userId,
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(ticket.id);

    expect(response.body.meta.query.dimensions.requesterId).toBe(
      fixture.requester.userId,
    );
  });

  it('should apply from and to date filtering', async () => {
    const inside = await createTicket({
      title: 'Inside analytics date range',
      createdAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    const outside = await createTicket({
      title: 'Outside analytics date range',
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    });

    const response = await getAnalytics({
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-06T23:59:59.999Z',
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(inside.id);
    expect(ids).not.toContain(outside.id);

    const body = response.body as AnalyticsResponse;

    expect(body.meta.query.dateFrom).toBe('2026-10-01T00:00:00.000Z');

    expect(body.meta.query.dateTo).toBe('2026-10-06T23:59:59.999Z');
  });

  it('should apply multiple dimensions together', async () => {
    const matching = await createTicket({
      title: 'Matching analytics ticket',
      status: 'RESOLVED',
      priority: 'HIGH',
      type: 'PROBLEM',
      assigneeId: fixture.agent.userId,
      createdAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    const wrongStatus = await createTicket({
      title: 'Wrong status ticket',
      status: 'OPEN',
      priority: 'HIGH',
      type: 'PROBLEM',
      assigneeId: fixture.agent.userId,
      createdAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    const wrongPriority = await createTicket({
      title: 'Wrong priority ticket',
      status: 'RESOLVED',
      priority: 'LOW',
      type: 'PROBLEM',
      assigneeId: fixture.agent.userId,
      createdAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    const wrongDate = await createTicket({
      title: 'Wrong date ticket',
      status: 'RESOLVED',
      priority: 'HIGH',
      type: 'PROBLEM',
      assigneeId: fixture.agent.userId,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    });

    const response = await getAnalytics({
      status: 'RESOLVED',
      priority: 'HIGH',
      type: 'PROBLEM',
      assigneeId: fixture.agent.userId,
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-06T23:59:59.999Z',
    });

    const ids = getTicketIds(response);

    expect(ids).toContain(matching.id);
    expect(ids).not.toContain(wrongStatus.id);
    expect(ids).not.toContain(wrongPriority.id);
    expect(ids).not.toContain(wrongDate.id);
  });

  it('should reject conflicting assigneeId and unassigned', async () => {
    await analyticsRequest()
      .query({
        assigneeId: fixture.agent.userId,
        unassigned: true,
      })
      .expect(400);
  });

  it('should reject conflicting teamId and unassignedTeam', async () => {
    await analyticsRequest()
      .query({
        teamId: analyticsTeamId,
        unassignedTeam: true,
      })
      .expect(400);
  });

  it('should reject inverted date ranges', async () => {
    await analyticsRequest()
      .query({
        from: '2026-10-06T00:00:00.000Z',
        to: '2026-10-05T00:00:00.000Z',
      })
      .expect(400);
  });

  it('should reject invalid date values', async () => {
    await analyticsRequest()
      .query({
        from: 'not-a-date',
      })
      .expect(400);
  });

  it('should reject an invalid status', async () => {
    await analyticsRequest()
      .query({
        status: 'NOT_A_STATUS',
      })
      .expect(400);
  });

  it('should reject an invalid priority', async () => {
    await analyticsRequest()
      .query({
        priority: 'NOT_A_PRIORITY',
      })
      .expect(400);
  });

  it('should reject an invalid ticket type', async () => {
    await analyticsRequest()
      .query({
        type: 'NOT_A_TYPE',
      })
      .expect(400);
  });

  it('should reject a limit greater than 100', async () => {
    await analyticsRequest()
      .query({
        limit: 101,
      })
      .expect(400);
  });

  it('should reject a non-positive page', async () => {
    await analyticsRequest()
      .query({
        page: 0,
      })
      .expect(400);
  });

  it('should preserve pagination metadata', async () => {
    await createTicket({
      title: 'Pagination ticket 1',
    });

    await createTicket({
      title: 'Pagination ticket 2',
    });

    await createTicket({
      title: 'Pagination ticket 3',
    });

    const response = await getAnalytics({
      page: 1,
      limit: 2,
    });

    const body = response.body as AnalyticsResponse;

    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(2);
    expect(body.data.tickets.length).toBeLessThanOrEqual(2);
    expect(body.meta.total).toBeGreaterThanOrEqual(3);
    expect(body.meta.totalPages).toBe(Math.ceil(body.meta.total / 2));
  });

  it('should support ascending createdAt ordering', async () => {
    const older = await createTicket({
      title: 'Older analytics ticket',
      createdAt: new Date('2026-10-01T10:00:00.000Z'),
    });

    const newer = await createTicket({
      title: 'Newer analytics ticket',
      createdAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    const response = await getAnalytics({
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    const ids = getTicketIds(response);

    const olderIndex = ids.indexOf(older.id);
    const newerIndex = ids.indexOf(newer.id);

    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeLessThan(newerIndex);
  });

  it('should support descending updatedAt ordering', async () => {
    const older = await createTicket({
      title: 'Older updated ticket',
      updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    });

    const newer = await createTicket({
      title: 'Newer updated ticket',
      updatedAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    const response = await getAnalytics({
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });

    const ids = getTicketIds(response);

    const olderIndex = ids.indexOf(older.id);
    const newerIndex = ids.indexOf(newer.id);

    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeLessThan(olderIndex);
  });

  it('should not expose tickets from another organization', async () => {
    const ownTicket = await createTicket({
      title: 'Current organization ticket',
    });

    const otherFixture = await createOrganizationTestFixture(app);

    try {
      const foreignTicket = await database.ticket.create({
        data: {
          organizationId: otherFixture.organization.id,
          requesterId: otherFixture.requester.userId,
          ticketNumber: `FOREIGN-AN-${randomUUID().slice(0, 8).toUpperCase()}`,
          title: 'Foreign analytics ticket',
          description: 'Must not appear in analytics foundation.',
          status: 'OPEN',
          priority: 'URGENT',
          type: 'INCIDENT',
        },
      });

      const response = await getAnalytics();

      const ids = getTicketIds(response);

      expect(ids).toContain(ownTicket.id);
      expect(ids).not.toContain(foreignTicket.id);
      expect(response.body.meta.query.organizationScoped).toBe(true);
    } finally {
      await database.organization.delete({
        where: {
          id: otherFixture.organization.id,
        },
      });

      await database.user.deleteMany({
        where: {
          id: {
            in: [
              otherFixture.owner.userId,
              otherFixture.admin.userId,
              otherFixture.agent.userId,
              otherFixture.requester.userId,
            ],
          },
        },
      });
    }
  });

  it('should return an empty result for a valid range with no matching tickets', async () => {
    const response = await getAnalytics({
      from: '2035-01-01T00:00:00.000Z',
      to: '2035-01-02T00:00:00.000Z',
    });

    const body = response.body as AnalyticsResponse;

    expect(body.data.total).toBe(0);
    expect(body.data.tickets).toEqual([]);
    expect(body.meta.total).toBe(0);
    expect(body.meta.totalPages).toBe(0);
  });
});
