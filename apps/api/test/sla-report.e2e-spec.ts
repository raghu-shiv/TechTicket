import type { INestApplication } from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';

import { createTestApp } from './helpers/app.helper.js';

import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

interface SlaReportAssigneePoint {
  id: string | null;

  key: string;

  label: string;

  tracked: number;

  breached: number;

  breachRate: number;

  atRisk: number;

  active: number;

  resolved: number;

  firstResponse: {
    completed: number;
    compliant: number;
    breached: number;
    complianceRate: number | null;
  };

  resolution: {
    completed: number;
    compliant: number;
    breached: number;
    complianceRate: number | null;
  };
}

interface SlaReportTeamPoint {
  id: string | null;

  key: string;

  label: string;

  tracked: number;

  breached: number;

  breachRate: number;

  atRisk: number;

  active: number;

  resolved: number;

  firstResponse: {
    completed: number;
    compliant: number;
    breached: number;
    complianceRate: number | null;
  };

  resolution: {
    completed: number;
    compliant: number;
    breached: number;
    complianceRate: number | null;
  };
}

interface SlaReportResponse {
  data: {
    summary: {
      totalTracked: number;

      breached: number;

      atRisk: number;
      active: number;
      resolved: number;

      firstResponse: {
        completed: number;
        compliant: number;
        breached: number;
        complianceRate: number | null;
      };

      resolution: {
        completed: number;
        compliant: number;
        breached: number;
        complianceRate: number | null;
      };
    };

    trend: unknown[];

    byPriority: unknown[];

    byTeam: SlaReportTeamPoint[];

    byAssignee: SlaReportAssigneePoint[];
  };

  meta: {
    query: {
      dateField: 'createdAt' | 'updatedAt';
      dateFrom: string | null;
      dateTo: string | null;
      organizationScoped: true;
      queryVersion: 1;
    };
  };
}

describe('SLA Reports API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;

  const createdTicketIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);

    fixture = await createOrganizationTestFixture(app);
  });

  afterEach(async () => {
    if (createdTicketIds.length > 0) {
      await database.ticket.deleteMany({
        where: {
          id: {
            in: createdTicketIds,
          },
        },
      });

      createdTicketIds.length = 0;
    }
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

  function reportRequest() {
    return fixture.owner.agent
      .get('/api/v1/reports/analytics/sla')
      .set('x-organization-id', fixture.organization.id);
  }

  async function createSlaTicket(input: {
    title: string;

    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

    status?: 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';

    teamId?: string | null;

    assigneeId?: string | null;

    createdAt?: Date;
    resolvedAt?: Date | null;

    firstResponseMinutes?: number;
    resolutionMinutes?: number;

    firstResponseDueAt: Date;
    resolutionDueAt: Date;

    firstRespondedAt?: Date | null;
    firstResponseBreachedAt?: Date | null;
    resolutionBreachedAt?: Date | null;
  }) {
    const ticket = await database.ticket.create({
      data: {
        organizationId: fixture.organization.id,
        requesterId: fixture.requester.userId,

        ticketNumber: `SLA-RPT-${randomUUID().slice(0, 8).toUpperCase()}`,

        title: input.title,
        description: input.title,

        priority: input.priority ?? 'MEDIUM',
        status: input.status ?? 'OPEN',
        type: 'INCIDENT',

        teamId: input.teamId ?? null,

        assigneeId: input.assigneeId ?? null,

        createdAt: input.createdAt ?? new Date(),
        resolvedAt: input.resolvedAt ?? null,

        sla: {
          create: {
            firstResponseMinutes: input.firstResponseMinutes ?? 60,

            resolutionMinutes: input.resolutionMinutes ?? 240,

            firstResponseDueAt: input.firstResponseDueAt,

            resolutionDueAt: input.resolutionDueAt,

            firstRespondedAt: input.firstRespondedAt ?? null,

            firstResponseBreachedAt: input.firstResponseBreachedAt ?? null,

            resolutionBreachedAt: input.resolutionBreachedAt ?? null,
          },
        },
      },
    });

    createdTicketIds.push(ticket.id);

    return ticket;
  }

  it('should return the SLA report contract', async () => {
    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          summary: expect.any(Object),
          trend: expect.any(Array),
          byPriority: expect.any(Array),
          byTeam: expect.any(Array),
          byAssignee: expect.any(Array),
        }),

        meta: expect.objectContaining({
          query: expect.objectContaining({
            organizationScoped: true,
            queryVersion: 1,
          }),
        }),
      }),
    );
  });

  it('should return an empty SLA report when no SLA tickets exist', async () => {
    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary).toEqual({
      totalTracked: 0,

      breached: 0,

      atRisk: 0,

      active: 0,

      resolved: 0,

      firstResponse: {
        completed: 0,
        compliant: 0,
        breached: 0,
        complianceRate: null,
      },

      resolution: {
        completed: 0,
        compliant: 0,
        breached: 0,
        complianceRate: null,
      },
    });

    expect(body.data.trend).toEqual([]);
    expect(body.data.byPriority).toEqual([]);
    expect(body.data.byTeam).toEqual([]);
    expect(body.data.byAssignee).toEqual([]);
  });

  it('should count SLA-tracked tickets only', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Tracked ticket',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const ticketWithoutSla = await database.ticket.create({
      data: {
        organizationId: fixture.organization.id,
        requesterId: fixture.requester.userId,

        ticketNumber: `NO-SLA-${randomUUID().slice(0, 8).toUpperCase()}`,

        title: 'Ticket without SLA',
        description: 'Ticket without SLA',

        priority: 'MEDIUM',
        status: 'OPEN',
        type: 'INCIDENT',
      },
    });

    createdTicketIds.push(ticketWithoutSla.id);

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.totalTracked).toBe(1);
  });

  it('should calculate SLA breach and component compliance totals', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Compliant ticket',

      firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      firstRespondedAt: new Date(now.getTime() - 90 * 60 * 1000),

      resolvedAt: new Date(now.getTime() - 30 * 60 * 1000),

      status: 'RESOLVED',
    });

    await createSlaTicket({
      title: 'Breached ticket',

      firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() - 30 * 60 * 1000),

      firstResponseBreachedAt: new Date(now.getTime() - 40 * 60 * 1000),

      resolutionBreachedAt: new Date(now.getTime() - 20 * 60 * 1000),

      resolvedAt: new Date(now.getTime() - 10 * 60 * 1000),

      status: 'RESOLVED',
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.totalTracked).toBe(2);

    expect(body.data.summary.breached).toBe(1);

    expect(body.data.summary.totalTracked).toBe(2);

    expect(body.data.summary.breached).toBe(1);

    expect(body.data.summary.firstResponse).toEqual({
      completed: 1,
      compliant: 1,
      breached: 1,
      complianceRate: 100,
    });
  });

  it('should expose first-response compliance independently from resolution compliance', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'First response compliant',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstRespondedAt: new Date(now.getTime() - 5 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'First response breached',

      firstResponseDueAt: new Date(now.getTime() - 30 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstResponseBreachedAt: new Date(now.getTime() - 20 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.firstResponse.completed).toBeGreaterThanOrEqual(1);

    expect(body.data.summary.firstResponse.compliant).toBeGreaterThanOrEqual(1);

    expect(body.data.summary.firstResponse.breached).toBeGreaterThanOrEqual(1);

    expect(body.data.summary.firstResponse.complianceRate).toEqual(
      expect.any(Number),
    );
  });

  it('should calculate resolution compliance from resolved tickets', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Resolution compliant',

      firstResponseDueAt: new Date(now.getTime() + 30 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolvedAt: new Date(now.getTime() - 5 * 60 * 1000),

      status: 'RESOLVED',
    });

    await createSlaTicket({
      title: 'Resolution breached',

      firstResponseDueAt: new Date(now.getTime() + 30 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() - 60 * 60 * 1000),

      resolutionBreachedAt: new Date(now.getTime() - 30 * 60 * 1000),

      resolvedAt: new Date(now.getTime() - 10 * 60 * 1000),

      status: 'RESOLVED',
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.resolution.completed).toBeGreaterThanOrEqual(2);

    expect(body.data.summary.resolution.compliant).toBeGreaterThanOrEqual(1);

    expect(body.data.summary.resolution.breached).toBeGreaterThanOrEqual(1);
  });

  it('should support shared analytics date filtering', async () => {
    const inside = new Date('2026-10-05T12:00:00.000Z');

    const outside = new Date('2026-09-01T12:00:00.000Z');

    await createSlaTicket({
      title: 'Inside date range',

      createdAt: inside,

      firstResponseDueAt: new Date(inside.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(inside.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Outside date range',

      createdAt: outside,

      firstResponseDueAt: new Date(outside.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(outside.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest()
      .query({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-06T23:59:59.999Z',
      })
      .expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.totalTracked).toBe(1);
  });

  it('should preserve organization isolation', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Own organization ticket',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const foreign = await createOrganizationTestFixture(app);

    try {
      await database.ticket.create({
        data: {
          organizationId: foreign.organization.id,
          requesterId: foreign.requester.userId,

          ticketNumber: `FOREIGN-${randomUUID().slice(0, 8).toUpperCase()}`,

          title: 'Foreign SLA ticket',
          description: 'Foreign SLA ticket',

          priority: 'HIGH',
          status: 'OPEN',
          type: 'INCIDENT',

          sla: {
            create: {
              firstResponseMinutes: 60,
              resolutionMinutes: 240,

              firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

              resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            },
          },
        },
      });

      const response = await reportRequest().expect(200);

      const body = response.body as SlaReportResponse;

      expect(body.data.summary.totalTracked).toBe(1);
    } finally {
      await database.organization.delete({
        where: {
          id: foreign.organization.id,
        },
      });

      await database.user.deleteMany({
        where: {
          id: {
            in: [
              foreign.owner.userId,
              foreign.admin.userId,
              foreign.agent.userId,
              foreign.requester.userId,
            ],
          },
        },
      });
    }
  });

  it('should require authentication', async () => {
    const response = await import('supertest').then(({ default: supertest }) =>
      supertest(app.getHttpServer())
        .get('/api/v1/reports/analytics/sla')
        .set('x-organization-id', fixture.organization.id),
    );

    expect(response.status).toBe(401);
  });

  it('should reject invalid date ranges', async () => {
    await reportRequest()
      .query({
        from: '2026-10-07T00:00:00.000Z',
        to: '2026-10-01T00:00:00.000Z',
      })
      .expect(400);
  });

  it('should return null component compliance rates when no SLA activity exists', async () => {
    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary).toMatchObject({
      totalTracked: 0,
      breached: 0,
      atRisk: 0,
      active: 0,
      resolved: 0,

      firstResponse: {
        completed: 0,
        compliant: 0,
        breached: 0,
        complianceRate: null,
      },

      resolution: {
        completed: 0,
        compliant: 0,
        breached: 0,
        complianceRate: null,
      },
    });
  });

  it('should calculate first-response summary independently', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'First response compliant',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstRespondedAt: new Date(now.getTime() - 10 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'First response breached',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstResponseBreachedAt: new Date(now.getTime() - 5 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.firstResponse.completed).toBe(1);
    expect(body.data.summary.firstResponse.compliant).toBe(1);
    expect(body.data.summary.firstResponse.breached).toBe(1);
    expect(body.data.summary.firstResponse.complianceRate).toBe(100);
  });

  it('should calculate resolution summary independently', async () => {
    const now = new Date();

    const resolvedAt = new Date(now.getTime() - 30 * 60 * 1000);

    await createSlaTicket({
      title: 'Resolution compliant',

      status: 'RESOLVED',

      resolvedAt,

      firstResponseDueAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Resolution breached',

      status: 'RESOLVED',

      resolvedAt,

      firstResponseDueAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() - 60 * 60 * 1000),

      resolutionBreachedAt: new Date(now.getTime() - 45 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.resolution).toEqual({
      completed: 2,
      compliant: 1,
      breached: 1,
      complianceRate: 50,
    });
  });

  it('should keep active, at-risk, breached, and resolved counts mutually consistent', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Active',

      firstResponseDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'At risk',

      firstResponseMinutes: 60,

      resolutionMinutes: 240,

      firstResponseDueAt: new Date(now.getTime() + 5 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Breached',

      firstResponseDueAt: new Date(now.getTime() - 30 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      firstResponseBreachedAt: new Date(now.getTime() - 15 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Resolved',

      status: 'RESOLVED',

      resolvedAt: new Date(now.getTime() - 30 * 60 * 1000),

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.totalTracked).toBe(4);

    expect(body.data.summary.active).toBe(1);

    expect(body.data.summary.atRisk).toBe(1);

    expect(body.data.summary.breached).toBe(1);

    expect(body.data.summary.resolved).toBe(1);
  });

  it('should apply priority filtering to the SLA summary', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Urgent ticket',
      priority: 'URGENT',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Low ticket',
      priority: 'LOW',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest()
      .query({
        priority: 'URGENT',
      })
      .expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.totalTracked).toBe(1);
  });

  it('should return the SLA trend contract', async () => {
    const now = new Date('2026-10-05T12:00:00.000Z');

    await createSlaTicket({
      title: 'Trend ticket',

      createdAt: now,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.trend).toEqual([
      {
        date: '2026-10-05T00:00:00.000Z',

        tracked: 1,

        breached: 0,

        breachRate: 0,

        firstResponse: {
          completed: 0,
          compliant: 0,
          breached: 0,
          complianceRate: null,
        },

        resolution: {
          completed: 0,
          compliant: 0,
          breached: 0,
          complianceRate: null,
        },
      },
    ]);
  });

  it('should aggregate SLA metrics by day', async () => {
    const dayOne = new Date('2026-10-01T10:00:00.000Z');

    const dayTwo = new Date('2026-10-02T10:00:00.000Z');

    await createSlaTicket({
      title: 'Day one compliant',

      createdAt: dayOne,

      firstResponseDueAt: new Date(dayOne.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(dayOne.getTime() + 4 * 60 * 60 * 1000),

      firstRespondedAt: new Date(dayOne.getTime() + 30 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Day one breached',

      createdAt: new Date('2026-10-01T15:00:00.000Z'),

      firstResponseDueAt: new Date(dayOne.getTime() - 60 * 60 * 1000),

      resolutionDueAt: new Date(dayOne.getTime() + 4 * 60 * 60 * 1000),

      firstResponseBreachedAt: new Date(dayOne.getTime() + 30 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Day two ticket',

      createdAt: dayTwo,

      firstResponseDueAt: new Date(dayTwo.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(dayTwo.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.trend).toHaveLength(2);

    expect(body.data.trend.map((point) => point.date)).toEqual([
      '2026-10-01T00:00:00.000Z',
      '2026-10-02T00:00:00.000Z',
    ]);

    expect(body.data.trend[0]).toMatchObject({
      tracked: 2,
      breached: 1,
      breachRate: 50,

      firstResponse: {
        completed: 1,
        compliant: 1,
        breached: 1,
        complianceRate: 100,
      },
    });

    expect(body.data.trend[1]).toMatchObject({
      tracked: 1,
      breached: 0,

      firstResponse: {
        completed: 0,
        compliant: 0,
        breached: 0,
        complianceRate: null,
      },

      resolution: {
        completed: 0,
        compliant: 0,
        breached: 0,
        complianceRate: null,
      },
    });
  });

  it('should calculate resolution compliance independently in the trend', async () => {
    const day = new Date('2026-10-03T10:00:00.000Z');

    await createSlaTicket({
      title: 'Resolution compliant',

      createdAt: day,

      status: 'RESOLVED',

      resolvedAt: new Date(day.getTime() + 60 * 60 * 1000),

      firstResponseDueAt: new Date(day.getTime() + 30 * 60 * 1000),

      resolutionDueAt: new Date(day.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Resolution breached',

      createdAt: new Date(day.getTime() + 2 * 60 * 60 * 1000),

      status: 'RESOLVED',

      resolvedAt: new Date(day.getTime() + 3 * 60 * 60 * 1000),

      firstResponseDueAt: new Date(day.getTime() + 30 * 60 * 1000),

      resolutionDueAt: new Date(day.getTime() + 60 * 60 * 1000),

      resolutionBreachedAt: new Date(day.getTime() + 2 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.trend).toHaveLength(1);

    expect(body.data.trend[0].resolution).toEqual({
      completed: 2,
      compliant: 1,
      breached: 1,
      complianceRate: 50,
    });
  });

  it('should group the SLA trend using updatedAt when requested', async () => {
    const createdAt = new Date('2026-09-01T10:00:00.000Z');

    const updatedAt = new Date('2026-10-05T10:00:00.000Z');

    const ticket = await createSlaTicket({
      title: 'Updated date trend',

      createdAt,

      firstResponseDueAt: new Date(updatedAt.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(updatedAt.getTime() + 4 * 60 * 60 * 1000),
    });

    await database.ticket.update({
      where: {
        id: ticket.id,
      },

      data: {
        updatedAt,
      },
    });

    const response = await reportRequest()
      .query({
        dateField: 'updatedAt',
      })
      .expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.trend).toHaveLength(1);

    expect(body.data.trend[0].date).toBe('2026-10-05T00:00:00.000Z');
  });

  it('should keep SLA trend organization-scoped', async () => {
    const now = new Date('2026-10-05T12:00:00.000Z');

    await createSlaTicket({
      title: 'Own organization trend ticket',

      createdAt: now,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const foreign = await createOrganizationTestFixture(app);

    try {
      await database.ticket.create({
        data: {
          organizationId: foreign.organization.id,

          requesterId: foreign.requester.userId,

          ticketNumber: `FOREIGN-TREND-${randomUUID()
            .slice(0, 8)
            .toUpperCase()}`,

          title: 'Foreign trend ticket',

          description: 'Foreign trend ticket',

          priority: 'HIGH',

          status: 'OPEN',

          type: 'INCIDENT',

          createdAt: now,

          sla: {
            create: {
              firstResponseMinutes: 60,

              resolutionMinutes: 240,

              firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

              resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            },
          },
        },
      });

      const response = await reportRequest().expect(200);

      const body = response.body as SlaReportResponse;

      expect(body.data.trend).toHaveLength(1);

      expect(body.data.trend[0].tracked).toBe(1);
    } finally {
      await database.organization.delete({
        where: {
          id: foreign.organization.id,
        },
      });

      await database.user.deleteMany({
        where: {
          id: {
            in: [
              foreign.owner.userId,
              foreign.admin.userId,
              foreign.agent.userId,
              foreign.requester.userId,
            ],
          },
        },
      });
    }
  });

  it('should return SLA performance grouped by priority', async () => {
    const now = new Date('2026-10-05T12:00:00.000Z');

    await createSlaTicket({
      title: 'Urgent ticket',
      priority: 'URGENT',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'High ticket',
      priority: 'HIGH',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.byPriority).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'URGENT',
          label: 'URGENT',
          tracked: 1,
          breached: 0,
          breachRate: 0,
          atRisk: 0,
          active: 1,
          resolved: 0,
        }),

        expect.objectContaining({
          key: 'HIGH',
          label: 'HIGH',
          tracked: 1,
          breached: 0,
          breachRate: 0,
          atRisk: 0,
          active: 1,
          resolved: 0,
        }),
      ]),
    );
  });

  it('should calculate breach volume and rate independently by priority', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Urgent breached',
      priority: 'URGENT',

      firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstResponseBreachedAt: new Date(now.getTime() - 30 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Urgent compliant',
      priority: 'URGENT',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstRespondedAt: new Date(now.getTime() - 5 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Low ticket',
      priority: 'LOW',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    const urgent = body.data.byPriority.find((item) => item.key === 'URGENT');

    expect(urgent).toEqual(
      expect.objectContaining({
        tracked: 2,
        breached: 1,
        breachRate: 50,
      }),
    );

    const low = body.data.byPriority.find((item) => item.key === 'LOW');

    expect(low).toEqual(
      expect.objectContaining({
        tracked: 1,
        breached: 0,
        breachRate: 0,
      }),
    );
  });

  it('should calculate first-response and resolution performance independently by priority', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'High priority ticket',
      priority: 'HIGH',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstRespondedAt: new Date(now.getTime() - 5 * 60 * 1000),

      status: 'RESOLVED',

      resolvedAt: new Date(now.getTime() - 2 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'High priority breached response',
      priority: 'HIGH',

      firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstResponseBreachedAt: new Date(now.getTime() - 30 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    const high = body.data.byPriority.find((item) => item.key === 'HIGH');

    expect(high).toBeDefined();

    expect(high?.firstResponse).toEqual({
      completed: 1,
      compliant: 1,
      breached: 1,
      complianceRate: 100,
    });

    expect(high?.resolution).toEqual({
      completed: 1,
      compliant: 1,
      breached: 0,
      complianceRate: 100,
    });
  });

  it('should return priority groups in deterministic priority order', async () => {
    const now = new Date();

    for (const [index, priority] of [
      'LOW',
      'MEDIUM',
      'HIGH',
      'URGENT',
    ].entries()) {
      await createSlaTicket({
        title: `${priority} ticket`,
        priority,

        createdAt: new Date(now.getTime() + index * 1000),

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });
    }

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.byPriority.map((item) => item.key)).toEqual([
      'URGENT',
      'HIGH',
      'MEDIUM',
      'LOW',
    ]);
  });

  it('should keep SLA priority aggregation organization-scoped', async () => {
    const now = new Date('2026-10-05T12:00:00.000Z');

    await createSlaTicket({
      title: 'Own urgent ticket',
      priority: 'URGENT',

      createdAt: now,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const foreign = await createOrganizationTestFixture(app);

    try {
      await database.ticket.create({
        data: {
          organizationId: foreign.organization.id,

          requesterId: foreign.requester.userId,

          ticketNumber: `FOREIGN-PRIORITY-${randomUUID()
            .slice(0, 8)
            .toUpperCase()}`,

          title: 'Foreign urgent ticket',

          description: 'Foreign urgent ticket',

          priority: 'URGENT',

          status: 'OPEN',

          type: 'INCIDENT',

          createdAt: now,

          sla: {
            create: {
              firstResponseMinutes: 60,

              resolutionMinutes: 240,

              firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

              resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            },
          },
        },
      });

      const response = await reportRequest().expect(200);

      const body = response.body as SlaReportResponse;

      const urgent = body.data.byPriority.find((item) => item.key === 'URGENT');

      expect(urgent?.tracked).toBe(1);
    } finally {
      await database.organization.delete({
        where: {
          id: foreign.organization.id,
        },
      });

      await database.user.deleteMany({
        where: {
          id: {
            in: [
              foreign.owner.userId,
              foreign.admin.userId,
              foreign.agent.userId,
              foreign.requester.userId,
            ],
          },
        },
      });
    }
  });

  it('should apply the shared priority filter to SLA priority analytics', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Urgent ticket',
      priority: 'URGENT',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Low ticket',
      priority: 'LOW',

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest()
      .query({
        priority: 'URGENT',
      })
      .expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.totalTracked).toBe(1);

    expect(body.data.byPriority).toEqual([
      expect.objectContaining({
        key: 'URGENT',
        tracked: 1,
      }),
    ]);
  });

  it('should return SLA performance grouped by team', async () => {
    const now = new Date();

    const teamA = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `Support A ${randomUUID().slice(0, 6)}`,
      },
    });

    const teamB = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `Support B ${randomUUID().slice(0, 6)}`,
      },
    });

    await createSlaTicket({
      title: 'Team A ticket',
      teamId: teamA.id,
      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),
      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Team B ticket',
      teamId: teamB.id,
      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),
      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.byTeam).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: teamA.id,
          key: teamA.id,
          label: teamA.name,
          tracked: 1,
          breached: 0,
        }),

        expect.objectContaining({
          id: teamB.id,
          key: teamB.id,
          label: teamB.name,
          tracked: 1,
          breached: 0,
        }),
      ]),
    );
  });

  it('should calculate breach volume and rate independently by team', async () => {
    const now = new Date();

    const team = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `SLA Team ${randomUUID().slice(0, 6)}`,
      },
    });

    await createSlaTicket({
      title: 'Breached team ticket',
      teamId: team.id,

      firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),
      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstResponseBreachedAt: new Date(now.getTime() - 30 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Compliant team ticket',
      teamId: team.id,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),
      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstRespondedAt: new Date(now.getTime() - 5 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    const row = body.data.byTeam.find((item) => item.id === team.id);

    expect(row).toEqual(
      expect.objectContaining({
        tracked: 2,
        breached: 1,
        breachRate: 50,
      }),
    );
  });

  it('should calculate first-response and resolution performance independently by team', async () => {
    const now = new Date();

    const team = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `Performance Team ${randomUUID().slice(0, 6)}`,
      },
    });

    await createSlaTicket({
      title: 'Resolved compliant ticket',
      teamId: team.id,

      status: 'RESOLVED',

      resolvedAt: new Date(now.getTime() - 2 * 60 * 1000),

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),
      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstRespondedAt: new Date(now.getTime() - 5 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Response breached ticket',
      teamId: team.id,

      firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),
      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstResponseBreachedAt: new Date(now.getTime() - 30 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    const row = body.data.byTeam.find((item) => item.id === team.id);

    expect(row).toBeDefined();

    expect(row?.firstResponse).toEqual({
      completed: 1,
      compliant: 1,
      breached: 1,
      complianceRate: 100,
    });

    expect(row?.resolution).toEqual({
      completed: 1,
      compliant: 1,
      breached: 0,
      complianceRate: 100,
    });
  });

  it('should include an unassigned team bucket', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Unassigned team ticket',

      teamId: null,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    const unassigned = body.data.byTeam.find(
      (item) => item.key === '__UNASSIGNED__',
    );

    expect(unassigned).toEqual(
      expect.objectContaining({
        id: null,
        key: '__UNASSIGNED__',
        label: 'Unassigned',
        tracked: 1,
      }),
    );
  });

  it('should return teams in deterministic order', async () => {
    const now = new Date();

    const teamB = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `Beta Team ${randomUUID().slice(0, 6)}`,
      },
    });

    const teamA = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `Alpha Team ${randomUUID().slice(0, 6)}`,
      },
    });

    await createSlaTicket({
      title: 'Beta ticket',
      teamId: teamB.id,
      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),
      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Alpha ticket',
      teamId: teamA.id,
      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),
      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.byTeam.map((item) => item.label)).toEqual([
      teamA.name,
      teamB.name,
    ]);
  });

  it('should keep SLA team aggregation organization-scoped', async () => {
    const now = new Date();

    const ownTeam = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `Own Team ${randomUUID().slice(0, 6)}`,
      },
    });

    await createSlaTicket({
      title: 'Own team ticket',
      teamId: ownTeam.id,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const foreign = await createOrganizationTestFixture(app);

    try {
      const foreignTeam = await database.team.create({
        data: {
          organizationId: foreign.organization.id,
          name: 'Foreign Team',
        },
      });

      await database.ticket.create({
        data: {
          organizationId: foreign.organization.id,

          requesterId: foreign.requester.userId,

          ticketNumber: `FOREIGN-TEAM-${randomUUID()
            .slice(0, 8)
            .toUpperCase()}`,

          title: 'Foreign team ticket',

          description: 'Foreign team ticket',

          teamId: foreignTeam.id,

          priority: 'URGENT',

          status: 'OPEN',

          type: 'INCIDENT',

          createdAt: now,

          sla: {
            create: {
              firstResponseMinutes: 60,

              resolutionMinutes: 240,

              firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

              resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            },
          },
        },
      });

      const response = await reportRequest().expect(200);

      const body = response.body as SlaReportResponse;

      expect(body.data.byTeam).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ownTeam.id,
            tracked: 1,
          }),
        ]),
      );

      expect(body.data.byTeam.some((item) => item.id === foreignTeam.id)).toBe(
        false,
      );
    } finally {
      await database.organization.delete({
        where: {
          id: foreign.organization.id,
        },
      });

      await database.user.deleteMany({
        where: {
          id: {
            in: [
              foreign.owner.userId,
              foreign.admin.userId,
              foreign.agent.userId,
              foreign.requester.userId,
            ],
          },
        },
      });
    }
  });

  it('should apply the shared teamId filter to SLA team analytics', async () => {
    const now = new Date();

    const teamA = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `Filter Team A ${randomUUID().slice(0, 6)}`,
      },
    });

    const teamB = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `Filter Team B ${randomUUID().slice(0, 6)}`,
      },
    });

    await createSlaTicket({
      title: 'Team A ticket',
      teamId: teamA.id,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Team B ticket',
      teamId: teamB.id,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest()
      .query({
        teamId: teamA.id,
      })
      .expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.totalTracked).toBe(1);

    expect(body.data.byTeam).toEqual([
      expect.objectContaining({
        id: teamA.id,
        tracked: 1,
      }),
    ]);
  });

  it('should return SLA performance grouped by assignee', async () => {
    const now = new Date();

    const agent = await database.user.findUniqueOrThrow({
      where: {
        id: fixture.agent.userId,
      },
    });

    const admin = await database.user.findUniqueOrThrow({
      where: {
        id: fixture.admin.userId,
      },
    });

    await createSlaTicket({
      title: 'Agent ticket',

      assigneeId: fixture.agent.userId,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Admin ticket',

      assigneeId: fixture.admin.userId,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.byAssignee).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: fixture.agent.userId,
          key: fixture.agent.userId,
          label: agent.name,
          tracked: 1,
          breached: 0,
        }),

        expect.objectContaining({
          id: fixture.admin.userId,
          key: fixture.admin.userId,
          label: admin.name,
          tracked: 1,
          breached: 0,
        }),
      ]),
    );
  });

  it('should calculate breach volume and rate independently by assignee', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Breached assignee ticket',

      assigneeId: fixture.agent.userId,

      firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstResponseBreachedAt: new Date(now.getTime() - 30 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Compliant assignee ticket',

      assigneeId: fixture.agent.userId,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstRespondedAt: new Date(now.getTime() - 5 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    const row = body.data.byAssignee.find(
      (item) => item.id === fixture.agent.userId,
    );

    expect(row).toEqual(
      expect.objectContaining({
        tracked: 2,
        breached: 1,
        breachRate: 50,
      }),
    );
  });

  it('should calculate first-response and resolution performance independently by assignee', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Resolved compliant assignee ticket',

      assigneeId: fixture.agent.userId,

      status: 'RESOLVED',

      resolvedAt: new Date(now.getTime() - 2 * 60 * 1000),

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstRespondedAt: new Date(now.getTime() - 5 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Response breached assignee ticket',

      assigneeId: fixture.agent.userId,

      firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

      firstResponseBreachedAt: new Date(now.getTime() - 30 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    const row = body.data.byAssignee.find(
      (item) => item.id === fixture.agent.userId,
    );

    expect(row).toBeDefined();

    expect(row?.firstResponse).toEqual({
      completed: 1,
      compliant: 1,
      breached: 1,
      complianceRate: 100,
    });

    expect(row?.resolution).toEqual({
      completed: 1,
      compliant: 1,
      breached: 0,
      complianceRate: 100,
    });
  });

  it('should include an unassigned assignee bucket', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Unassigned ticket',

      assigneeId: null,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    const unassigned = body.data.byAssignee.find(
      (item) => item.key === '__UNASSIGNED__',
    );

    expect(unassigned).toEqual(
      expect.objectContaining({
        id: null,
        key: '__UNASSIGNED__',
        label: 'Unassigned',
        tracked: 1,
      }),
    );
  });

  it('should return assignees in deterministic order', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Admin ticket',

      assigneeId: fixture.admin.userId,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Agent ticket',

      assigneeId: fixture.agent.userId,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest().expect(200);

    const body = response.body as SlaReportResponse;

    const rows = body.data.byAssignee.filter(
      (item) =>
        item.id === fixture.admin.userId || item.id === fixture.agent.userId,
    );

    expect(rows.map((item) => item.label)).toEqual(
      rows.map((item) => item.label).sort((a, b) => a.localeCompare(b)),
    );
  });

  it('should keep SLA assignee aggregation organization-scoped', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Own organization ticket',

      assigneeId: fixture.agent.userId,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const foreign = await createOrganizationTestFixture(app);

    try {
      await database.ticket.create({
        data: {
          organizationId: foreign.organization.id,

          requesterId: foreign.requester.userId,

          assigneeId: foreign.agent.userId,

          ticketNumber: `FOREIGN-ASSIGNEE-${randomUUID()
            .slice(0, 8)
            .toUpperCase()}`,

          title: 'Foreign assignee ticket',

          description: 'Foreign assignee ticket',

          priority: 'HIGH',

          status: 'OPEN',

          type: 'INCIDENT',

          createdAt: now,

          sla: {
            create: {
              firstResponseMinutes: 60,

              resolutionMinutes: 240,

              firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

              resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            },
          },
        },
      });

      const response = await reportRequest().expect(200);

      const body = response.body as SlaReportResponse;

      expect(body.data.byAssignee).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: fixture.agent.userId,
            tracked: 1,
          }),
        ]),
      );

      expect(
        body.data.byAssignee.some((item) => item.id === foreign.agent.userId),
      ).toBe(false);
    } finally {
      await database.organization.delete({
        where: {
          id: foreign.organization.id,
        },
      });

      await database.user.deleteMany({
        where: {
          id: {
            in: [
              foreign.owner.userId,
              foreign.admin.userId,
              foreign.agent.userId,
              foreign.requester.userId,
            ],
          },
        },
      });
    }
  });

  it('should apply the shared assigneeId filter to SLA assignee analytics', async () => {
    const now = new Date();

    await createSlaTicket({
      title: 'Agent ticket',

      assigneeId: fixture.agent.userId,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    await createSlaTicket({
      title: 'Admin ticket',

      assigneeId: fixture.admin.userId,

      firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

      resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });

    const response = await reportRequest()
      .query({
        assigneeId: fixture.agent.userId,
      })
      .expect(200);

    const body = response.body as SlaReportResponse;

    expect(body.data.summary.totalTracked).toBe(1);

    expect(body.data.byAssignee).toEqual([
      expect.objectContaining({
        id: fixture.agent.userId,
        key: fixture.agent.userId,
        tracked: 1,
      }),
    ]);
  });
});
