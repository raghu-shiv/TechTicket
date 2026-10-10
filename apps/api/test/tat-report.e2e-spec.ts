import type { INestApplication } from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';

import { createTestApp } from './helpers/app.helper.js';

import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

interface TatMetric {
  sampleSize: number;
  averageMinutes: number | null;
  medianMinutes: number | null;
  p75Minutes: number | null;
  p90Minutes: number | null;
  p95Minutes: number | null;
}

interface TatDimensionPoint {
  id: string | null;
  key: string;
  label: string;
  resolvedTickets: number;
  firstResponse: TatMetric;
  resolution: TatMetric;
}

interface TatTicketRow {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  firstRespondedAt: string | null;
  resolvedAt: string;
  resolutionMinutes: number;
  team: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
  product: { id: string; name: string } | null;
}

interface TatReportResponse {
  data: {
    summary: {
      ticketCount: number;
      resolvedTicketCount: number;
      firstResponse: TatMetric;
      resolution: TatMetric;
    };
    trend: Array<{
      date: string;
      createdTickets: number;
      firstResponse: TatMetric;
      resolution: TatMetric;
    }>;
    byPriority: Array<Omit<TatDimensionPoint, 'id'>>;
    byTeam: TatDimensionPoint[];
    byAssignee: TatDimensionPoint[];
    byProduct: TatDimensionPoint[];
    resolvedTickets: TatTicketRow[];
  };
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    query: {
      dateField: 'createdAt' | 'updatedAt';
      dateFrom: string | null;
      dateTo: string | null;
      priority: string | null;
      status: string | null;
      type: string | null;
      teamId: string | null;
      assigneeId: string | null;
      requesterId: string | null;
      productId: string | null;
      unassigned: boolean | null;
      unassignedTeam: boolean | null;
      organizationScoped: true;
      queryVersion: number;
      durationUnit: 'minutes';
      trendCohort: 'createdAt';
    };
  };
}

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

type Status = 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';

const MINUTE_MS = 60_000;

const BASE_CREATED_AT = new Date('2026-01-10T10:00:00.000Z');

describe('TAT Reports API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;

  const createdTicketIds: string[] = [];
  const createdTeamIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);

    fixture = await createOrganizationTestFixture(app);
  });

  afterEach(async () => {
    // Delete tickets before their optional team/product records.
    if (createdTicketIds.length > 0) {
      await database.ticket.deleteMany({
        where: {
          id: { in: [...createdTicketIds] },
        },
      });

      createdTicketIds.length = 0;
    }

    if (createdProductIds.length > 0) {
      await database.product.deleteMany({
        where: {
          id: { in: [...createdProductIds] },
        },
      });

      createdProductIds.length = 0;
    }

    if (createdTeamIds.length > 0) {
      await database.team.deleteMany({
        where: {
          id: { in: [...createdTeamIds] },
        },
      });

      createdTeamIds.length = 0;
    }

    if (createdOrganizationIds.length > 0) {
      await database.organization.deleteMany({
        where: {
          id: { in: [...createdOrganizationIds] },
        },
      });

      createdOrganizationIds.length = 0;
    }
  });

  afterAll(async () => {
    if (fixture) {
      await database.organization.deleteMany({
        where: { id: fixture.organization.id },
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
    }

    await app?.close();
  });

  function reportRequest() {
    return fixture.owner.agent
      .get('/api/v1/reports/analytics/tat')
      .set('x-organization-id', fixture.organization.id);
  }

  async function createTicket(options: {
    title: string;
    organizationId?: string;
    priority?: Priority;
    status?: Status;
    type?: 'INCIDENT' | 'SERVICE_REQUEST' | 'QUESTION' | 'PROBLEM';
    requesterId?: string;
    assigneeId?: string | null;
    teamId?: string | null;
    productId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    resolvedAt?: Date | null;

    /**
     * Pass null to create a ticket without a TicketSla record.
     * Omit the property to create a snapshot with default target values.
     */
    sla?: {
      firstResponseMinutes?: number;
      resolutionMinutes?: number;
      firstRespondedAt?: Date | null;
    } | null;
  }) {
    const createdAt = options.createdAt ?? BASE_CREATED_AT;
    const firstResponseTarget = options.sla?.firstResponseMinutes ?? 60;
    const resolutionTarget = options.sla?.resolutionMinutes ?? 240;

    const ticket = await database.ticket.create({
      data: {
        organizationId: options.organizationId ?? fixture.organization.id,

        requesterId: options.requesterId ?? fixture.requester.userId,

        assigneeId:
          options.assigneeId === undefined ? null : options.assigneeId,

        teamId: options.teamId === undefined ? null : options.teamId,

        productId: options.productId === undefined ? null : options.productId,

        ticketNumber: `TAT-${randomUUID().slice(0, 8).toUpperCase()}`,

        title: options.title,
        description: `TAT E2E ticket: ${options.title}`,

        status: options.status ?? 'OPEN',
        priority: options.priority ?? 'MEDIUM',
        type: options.type ?? 'INCIDENT',

        createdAt,
        updatedAt: options.updatedAt ?? createdAt,
        resolvedAt: options.resolvedAt ?? null,

        ...(options.sla === null
          ? {}
          : {
              sla: {
                create: {
                  firstResponseMinutes: firstResponseTarget,
                  resolutionMinutes: resolutionTarget,

                  firstResponseDueAt: new Date(
                    createdAt.getTime() + firstResponseTarget * MINUTE_MS,
                  ),

                  resolutionDueAt: new Date(
                    createdAt.getTime() + resolutionTarget * MINUTE_MS,
                  ),

                  firstRespondedAt: options.sla?.firstRespondedAt ?? null,
                },
              },
            }),
      },
    });

    createdTicketIds.push(ticket.id);

    return ticket;
  }

  async function createTeam() {
    const team = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `TAT Team ${randomUUID().slice(0, 8)}`,
        description: 'Team for TAT report E2E tests',
      },
    });

    createdTeamIds.push(team.id);

    return team;
  }

  async function createProduct() {
    const product = await database.product.create({
      data: {
        organizationId: fixture.organization.id,
        name: `TAT Product ${randomUUID().slice(0, 8)}`,
        description: 'Product for TAT report E2E tests',
      },
    });

    createdProductIds.push(product.id);

    return product;
  }

  async function createOtherOrganization() {
    const organization = await database.organization.create({
      data: {
        name: `TAT Isolation ${randomUUID()}`,
        slug: `tat-isolation-${randomUUID()}`,
        description: 'Organization for TAT isolation tests',
      },
    });

    createdOrganizationIds.push(organization.id);

    return organization;
  }

  function expectMetricShape(metric: TatMetric) {
    expect(typeof metric.sampleSize).toBe('number');

    for (const value of [
      metric.averageMinutes,
      metric.medianMinutes,
      metric.p75Minutes,
      metric.p90Minutes,
      metric.p95Minutes,
    ]) {
      expect(value === null || typeof value === 'number').toBe(true);
    }
  }

  it('returns the TAT report contract and organization-scoped metadata', async () => {
    const response = await reportRequest().expect(200);

    const body = response.body as TatReportResponse;

    expect(body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          summary: expect.objectContaining({
            ticketCount: expect.any(Number),
            resolvedTicketCount: expect.any(Number),
            firstResponse: expect.any(Object),
            resolution: expect.any(Object),
          }),
          trend: expect.any(Array),
          byPriority: expect.any(Array),
          byTeam: expect.any(Array),
          byAssignee: expect.any(Array),
          byProduct: expect.any(Array),
          resolvedTickets: expect.any(Array),
        }),
        meta: expect.objectContaining({
          pagination: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
          }),
          query: expect.objectContaining({
            organizationScoped: true,
            queryVersion: 1,
            durationUnit: 'minutes',
            trendCohort: 'createdAt',
          }),
        }),
      }),
    );

    expectMetricShape(body.data.summary.firstResponse);
    expectMetricShape(body.data.summary.resolution);
  });

  it('returns empty arrays and null duration metrics for an empty cohort', async () => {
    const response = await reportRequest().expect(200);

    const body = response.body as TatReportResponse;

    expect(body.data.summary.ticketCount).toBe(0);
    expect(body.data.summary.resolvedTicketCount).toBe(0);

    expect(body.data.summary.firstResponse).toEqual({
      sampleSize: 0,
      averageMinutes: null,
      medianMinutes: null,
      p75Minutes: null,
      p90Minutes: null,
      p95Minutes: null,
    });

    expect(body.data.summary.resolution).toEqual({
      sampleSize: 0,
      averageMinutes: null,
      medianMinutes: null,
      p75Minutes: null,
      p90Minutes: null,
      p95Minutes: null,
    });

    expect(body.data.trend).toEqual([]);
    expect(body.data.byPriority).toEqual([]);
    expect(body.data.byTeam).toEqual([]);
    expect(body.data.byAssignee).toEqual([]);
    expect(body.data.byProduct).toEqual([]);
    expect(body.data.resolvedTickets).toEqual([]);

    expect(body.meta.pagination.total).toBe(0);
    expect(body.meta.pagination.totalPages).toBe(0);
  });

  it('calculates actual elapsed TAT rather than SLA target durations', async () => {
    const createdAt = new Date('2026-01-10T10:00:00.000Z');

    await createTicket({
      title: 'Actual TAT differs from target',
      createdAt,
      status: 'RESOLVED',
      resolvedAt: new Date(createdAt.getTime() + 150 * MINUTE_MS),
      sla: {
        // Deliberately much shorter than the actual elapsed durations.
        firstResponseMinutes: 1,
        resolutionMinutes: 2,
        firstRespondedAt: new Date(createdAt.getTime() + 42 * MINUTE_MS),
      },
    });

    const response = await reportRequest().expect(200);

    const body = response.body as TatReportResponse;

    expect(body.data.summary.firstResponse.sampleSize).toBe(1);
    expect(body.data.summary.firstResponse.averageMinutes).toBeCloseTo(42);
    expect(body.data.summary.firstResponse.medianMinutes).toBeCloseTo(42);

    expect(body.data.summary.resolution.sampleSize).toBe(1);
    expect(body.data.summary.resolution.averageMinutes).toBeCloseTo(150);
    expect(body.data.summary.resolution.medianMinutes).toBeCloseTo(150);

    expect(body.data.resolvedTickets).toHaveLength(1);
    expect(body.data.resolvedTickets[0].resolutionMinutes).toBeCloseTo(150);
  });

  it('calculates average, median, and continuous percentiles from ticket durations', async () => {
    const createdAt = new Date('2026-01-10T10:00:00.000Z');

    const intervals = [
      { firstResponse: 10, resolution: 60 },
      { firstResponse: 20, resolution: 120 },
      { firstResponse: 30, resolution: 180 },
    ];

    for (const [index, interval] of intervals.entries()) {
      await createTicket({
        title: `Percentile ticket ${index + 1}`,
        createdAt,
        status: 'RESOLVED',
        resolvedAt: new Date(
          createdAt.getTime() + interval.resolution * MINUTE_MS,
        ),
        sla: {
          firstRespondedAt: new Date(
            createdAt.getTime() + interval.firstResponse * MINUTE_MS,
          ),
        },
      });
    }

    const response = await reportRequest().expect(200);

    const body = response.body as TatReportResponse;
    const firstResponse = body.data.summary.firstResponse;
    const resolution = body.data.summary.resolution;

    expect(firstResponse.sampleSize).toBe(3);
    expect(firstResponse.averageMinutes).toBeCloseTo(20);
    expect(firstResponse.medianMinutes).toBeCloseTo(20);
    expect(firstResponse.p75Minutes).toBeCloseTo(25);
    expect(firstResponse.p90Minutes).toBeCloseTo(28);
    expect(firstResponse.p95Minutes).toBeCloseTo(29);

    expect(resolution.sampleSize).toBe(3);
    expect(resolution.averageMinutes).toBeCloseTo(120);
    expect(resolution.medianMinutes).toBeCloseTo(120);
    expect(resolution.p75Minutes).toBeCloseTo(150);
    expect(resolution.p90Minutes).toBeCloseTo(168);
    expect(resolution.p95Minutes).toBeCloseTo(174);
  });

  it('excludes missing timestamps and negative durations from duration samples', async () => {
    const createdAt = new Date('2026-01-10T10:00:00.000Z');

    await createTicket({
      title: 'No response or resolution yet',
      createdAt,
      status: 'OPEN',
      resolvedAt: null,
      sla: {
        firstRespondedAt: null,
      },
    });

    await createTicket({
      title: 'Invalid negative elapsed timestamps',
      createdAt,
      status: 'RESOLVED',
      resolvedAt: new Date(createdAt.getTime() - MINUTE_MS),
      sla: {
        firstRespondedAt: new Date(createdAt.getTime() - MINUTE_MS),
      },
    });

    const response = await reportRequest().expect(200);

    const body = response.body as TatReportResponse;

    // Missing or negative elapsed durations are excluded from metric samples.
    expect(body.data.summary.firstResponse.sampleSize).toBe(0);
    expect(body.data.summary.firstResponse.averageMinutes).toBeNull();

    expect(body.data.summary.resolution.sampleSize).toBe(0);
    expect(body.data.summary.resolution.averageMinutes).toBeNull();

    // The resolved ticket remains part of the cohort summary.
    expect(body.data.summary.ticketCount).toBe(2);
    expect(body.data.summary.resolvedTicketCount).toBe(1);

    // But a negative-resolution ticket cannot appear in the drill-down,
    // and must not inflate its pagination total.
    expect(body.data.resolvedTickets).toEqual([]);
    expect(body.meta.pagination.total).toBe(0);
    expect(body.meta.pagination.totalPages).toBe(0);
  });

  it('does not require an SLA snapshot to count a ticket in the cohort', async () => {
    await createTicket({
      title: 'Ticket without an SLA snapshot',
      createdAt: BASE_CREATED_AT,
      status: 'RESOLVED',
      resolvedAt: new Date(BASE_CREATED_AT.getTime() + 90 * MINUTE_MS),
      sla: null,
    });

    const response = await reportRequest().expect(200);

    const body = response.body as TatReportResponse;

    expect(body.data.summary.ticketCount).toBe(1);
    expect(body.data.summary.resolvedTicketCount).toBe(1);
    expect(body.data.summary.resolution.sampleSize).toBe(1);
    expect(body.data.summary.resolution.averageMinutes).toBeCloseTo(90);
    expect(body.data.summary.firstResponse.sampleSize).toBe(0);
  });

  it('groups TAT by priority, team, assignee, and product', async () => {
    const team = await createTeam();
    const product = await createProduct();
    const createdAt = new Date('2026-01-10T10:00:00.000Z');

    await createTicket({
      title: 'Assigned product ticket',
      createdAt,
      status: 'RESOLVED',
      priority: 'HIGH',
      teamId: team.id,
      assigneeId: fixture.agent.userId,
      productId: product.id,
      resolvedAt: new Date(createdAt.getTime() + 120 * MINUTE_MS),
      sla: {
        firstRespondedAt: new Date(createdAt.getTime() + 15 * MINUTE_MS),
      },
    });

    await createTicket({
      title: 'Unassigned unclassified ticket',
      createdAt,
      status: 'RESOLVED',
      priority: 'LOW',
      resolvedAt: new Date(createdAt.getTime() + 60 * MINUTE_MS),
      sla: {
        firstRespondedAt: new Date(createdAt.getTime() + 10 * MINUTE_MS),
      },
    });

    const response = await reportRequest().expect(200);

    const body = response.body as TatReportResponse;

    expect(body.data.byPriority.map((row) => row.key)).toEqual(
      expect.arrayContaining(['HIGH', 'LOW']),
    );

    expect(body.data.byTeam).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: team.id,
          label: team.name,
          resolvedTickets: 1,
        }),
        expect.objectContaining({
          id: null,
          label: 'Unassigned',
        }),
      ]),
    );

    expect(body.data.byAssignee).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: fixture.agent.userId,
          label: expect.any(String),
          resolvedTickets: 1,
        }),
        expect.objectContaining({
          id: null,
          label: 'Unassigned',
        }),
      ]),
    );

    expect(body.data.byProduct).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: product.id,
          label: product.name,
          resolvedTickets: 1,
        }),
        expect.objectContaining({
          id: null,
          label: 'Unclassified',
        }),
      ]),
    );
  });

  it('applies shared date, priority, and status filters', async () => {
    const insideDateRange = new Date('2026-01-10T10:00:00.000Z');
    const outsideDateRange = new Date('2026-02-10T10:00:00.000Z');

    await createTicket({
      title: 'Matching ticket',
      createdAt: insideDateRange,
      status: 'RESOLVED',
      priority: 'HIGH',
      resolvedAt: new Date(insideDateRange.getTime() + 30 * MINUTE_MS),
      sla: {
        firstRespondedAt: new Date(insideDateRange.getTime() + 5 * MINUTE_MS),
      },
    });

    await createTicket({
      title: 'Outside date range',
      createdAt: outsideDateRange,
      status: 'RESOLVED',
      priority: 'HIGH',
      resolvedAt: new Date(outsideDateRange.getTime() + 60 * MINUTE_MS),
      sla: {
        firstRespondedAt: new Date(outsideDateRange.getTime() + 10 * MINUTE_MS),
      },
    });

    await createTicket({
      title: 'Wrong priority',
      createdAt: insideDateRange,
      status: 'RESOLVED',
      priority: 'LOW',
      resolvedAt: new Date(insideDateRange.getTime() + 90 * MINUTE_MS),
      sla: {
        firstRespondedAt: new Date(insideDateRange.getTime() + 15 * MINUTE_MS),
      },
    });

    const response = await reportRequest()
      .query({
        from: '2026-01-10T00:00:00.000Z',
        to: '2026-01-10T23:59:59.999Z',
        dateField: 'createdAt',
        priority: 'HIGH',
        status: 'RESOLVED',
      })
      .expect(200);

    const body = response.body as TatReportResponse;

    expect(body.data.summary.ticketCount).toBe(1);
    expect(body.data.summary.resolvedTicketCount).toBe(1);
    expect(body.data.summary.resolution.averageMinutes).toBeCloseTo(30);

    expect(body.meta.query.dateField).toBe('createdAt');
    expect(body.meta.query.priority).toBe('HIGH');
    expect(body.meta.query.status).toBe('RESOLVED');
    expect(body.meta.query.dateFrom).toBe('2026-01-10T00:00:00.000Z');
    expect(body.meta.query.dateTo).toBe('2026-01-10T23:59:59.999Z');
  });

  it('groups trend points by the ticket creation date', async () => {
    const dayOne = new Date('2026-01-10T10:00:00.000Z');
    const dayTwo = new Date('2026-01-11T10:00:00.000Z');

    await createTicket({
      title: 'Day one ticket',
      createdAt: dayOne,
      status: 'RESOLVED',
      resolvedAt: new Date(dayOne.getTime() + 60 * MINUTE_MS),
      sla: {
        firstRespondedAt: new Date(dayOne.getTime() + 10 * MINUTE_MS),
      },
    });

    await createTicket({
      title: 'Day two ticket',
      createdAt: dayTwo,
      status: 'RESOLVED',
      resolvedAt: new Date(dayTwo.getTime() + 120 * MINUTE_MS),
      sla: {
        firstRespondedAt: new Date(dayTwo.getTime() + 20 * MINUTE_MS),
      },
    });

    const response = await reportRequest().expect(200);

    const body = response.body as TatReportResponse;

    expect(body.data.trend).toHaveLength(2);

    expect(body.data.trend[0].date).toBe('2026-01-10T00:00:00.000Z');
    expect(body.data.trend[0].createdTickets).toBe(1);
    expect(body.data.trend[0].resolution.averageMinutes).toBeCloseTo(60);

    expect(body.data.trend[1].date).toBe('2026-01-11T00:00:00.000Z');
    expect(body.data.trend[1].createdTickets).toBe(1);
    expect(body.data.trend[1].resolution.averageMinutes).toBeCloseTo(120);

    expect(body.meta.query.trendCohort).toBe('createdAt');
  });

  it('paginates resolved-ticket drill-down rows and returns pagination metadata', async () => {
    const createdAt = new Date('2026-01-10T10:00:00.000Z');

    for (let index = 1; index <= 3; index += 1) {
      await createTicket({
        title: `Resolved pagination ticket ${index}`,
        createdAt: new Date(createdAt.getTime() + index * MINUTE_MS),
        status: 'RESOLVED',
        resolvedAt: new Date(
          createdAt.getTime() + (index * 30 + index) * MINUTE_MS,
        ),
        sla: {
          firstRespondedAt: new Date(
            createdAt.getTime() + index * MINUTE_MS + 5 * MINUTE_MS,
          ),
        },
      });
    }

    const response = await reportRequest()
      .query({ page: 1, limit: 2 })
      .expect(200);

    const body = response.body as TatReportResponse;

    expect(body.data.resolvedTickets).toHaveLength(2);
    expect(body.meta.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const secondPage = await reportRequest()
      .query({ page: 2, limit: 2 })
      .expect(200);

    const secondBody = secondPage.body as TatReportResponse;

    expect(secondBody.data.resolvedTickets).toHaveLength(1);
    expect(secondBody.meta.pagination.total).toBe(3);

    expect(body.data.resolvedTickets.map((ticket) => ticket.id)).not.toContain(
      secondBody.data.resolvedTickets[0].id,
    );
  });

  it('does not include another organization’s tickets in any TAT metric', async () => {
    const otherOrganization = await createOtherOrganization();
    const createdAt = new Date('2026-01-10T10:00:00.000Z');

    await createTicket({
      title: 'Current organization ticket',
      createdAt,
      status: 'RESOLVED',
      resolvedAt: new Date(createdAt.getTime() + 60 * MINUTE_MS),
      sla: {
        firstRespondedAt: new Date(createdAt.getTime() + 10 * MINUTE_MS),
      },
    });

    const otherTicket = await createTicket({
      title: 'Other organization ticket',
      organizationId: otherOrganization.id,
      createdAt,
      status: 'RESOLVED',
      resolvedAt: new Date(createdAt.getTime() + 900 * MINUTE_MS),
      sla: {
        firstRespondedAt: new Date(createdAt.getTime() + 300 * MINUTE_MS),
      },
    });

    const response = await reportRequest().expect(200);

    const body = response.body as TatReportResponse;

    expect(body.data.summary.ticketCount).toBe(1);
    expect(body.data.summary.resolvedTicketCount).toBe(1);
    expect(body.data.summary.firstResponse.averageMinutes).toBeCloseTo(10);
    expect(body.data.summary.resolution.averageMinutes).toBeCloseTo(60);

    expect(
      body.data.resolvedTickets.some((ticket) => ticket.id === otherTicket.id),
    ).toBe(false);

    expect(body.meta.query.organizationScoped).toBe(true);
  });

  it('rejects an inverted date range', async () => {
    await reportRequest()
      .query({
        from: '2026-01-11T00:00:00.000Z',
        to: '2026-01-10T00:00:00.000Z',
      })
      .expect(400);
  });
});
