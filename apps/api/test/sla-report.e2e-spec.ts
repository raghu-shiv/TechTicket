import type { INestApplication } from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';

import { createTestApp } from './helpers/app.helper.js';

import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

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
});
