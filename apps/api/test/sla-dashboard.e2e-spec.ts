import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

type SlaDashboardView =
  | 'ALL'
  | 'ACTIVE'
  | 'AT_RISK'
  | 'BREACHED'
  | 'RESOLVED'
  | 'FIRST_RESPONSE_BREACHED'
  | 'RESOLUTION_BREACHED';

interface SlaDashboardResponse {
  data: {
    metrics: {
      total: number;
      active: number;
      atRisk: number;
      breached: number;
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

    tickets: Array<{
      id: string;
      ticketNumber: string;
      title: string;
      status: string;
      priority: string;

      team: {
        id: string;
        name: string | null;
      } | null;

      assignee: {
        id: string;
        name: string | null;
      } | null;

      createdAt: string;
      resolvedAt: string | null;

      firstResponse: {
        dueAt: string;
        respondedAt: string | null;
        breachedAt: string | null;
      };

      resolution: {
        dueAt: string;
        breachedAt: string | null;
      };
    }>;
  };

  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

describe('SLA Dashboard API (e2e)', () => {
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

  function organizationHeaders<T>(request: T): T {
    return (
      request as T & {
        set: (field: string, value: string) => T;
      }
    ).set('x-organization-id', fixture.organization.id);
  }

  function owner() {
    return fixture.owner.agent;
  }

  async function createSlaTicket(options: {
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
    const now = new Date();

    const ticket = await database.ticket.create({
      data: {
        organizationId: fixture.organization.id,
        requesterId: fixture.requester.userId,

        assigneeId: options.assigneeId ?? null,
        teamId: options.teamId ?? null,

        ticketNumber: `SLA-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: options.title,
        description: `SLA dashboard test ticket: ${options.title}`,

        status: options.status ?? 'OPEN',
        priority: options.priority ?? 'MEDIUM',
        type: 'INCIDENT',

        createdAt: options.createdAt ?? now,
        resolvedAt: options.resolvedAt ?? null,

        sla: {
          create: {
            firstResponseMinutes: options.firstResponseMinutes ?? 60,
            resolutionMinutes: options.resolutionMinutes ?? 240,

            firstResponseDueAt: options.firstResponseDueAt,
            resolutionDueAt: options.resolutionDueAt,

            firstRespondedAt: options.firstRespondedAt ?? null,
            firstResponseBreachedAt: options.firstResponseBreachedAt ?? null,

            resolutionBreachedAt: options.resolutionBreachedAt ?? null,
          },
        },
      },
      include: {
        sla: true,
      },
    });

    createdTicketIds.push(ticket.id);

    return ticket;
  }

  async function getDashboard(
    query: Record<string, string | number | undefined> = {},
  ) {
    return organizationHeaders(owner().get('/api/v1/reports/sla/dashboard'))
      .query(query)
      .expect(200);
  }

  describe('GET /api/v1/reports/sla/dashboard', () => {
    it('should return the complete dashboard response shape', async () => {
      const now = new Date();

      await createSlaTicket({
        title: 'Complete SLA dashboard shape',
        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),
        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });

      const response = await getDashboard();

      const body = response.body as SlaDashboardResponse;

      expect(body).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            metrics: expect.objectContaining({
              total: expect.any(Number),
              active: expect.any(Number),
              atRisk: expect.any(Number),
              breached: expect.any(Number),
              resolved: expect.any(Number),

              firstResponse: expect.objectContaining({
                completed: expect.any(Number),
                compliant: expect.any(Number),
                breached: expect.any(Number),
              }),

              resolution: expect.objectContaining({
                completed: expect.any(Number),
                compliant: expect.any(Number),
                breached: expect.any(Number),
              }),
            }),

            tickets: expect.any(Array),
          }),

          meta: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
          }),
        }),
      );

      expect(
        body.data.metrics.firstResponse.complianceRate === null ||
          typeof body.data.metrics.firstResponse.complianceRate === 'number',
      ).toBe(true);

      expect(
        body.data.metrics.resolution.complianceRate === null ||
          typeof body.data.metrics.resolution.complianceRate === 'number',
      ).toBe(true);
    });

    it('should return SLA tickets belonging only to the current organization', async () => {
      const now = new Date();

      const ownTicket = await createSlaTicket({
        title: 'Organization A SLA ticket',
        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),
        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });

      const otherFixture = await createOrganizationTestFixture(app);

      try {
        const foreignTicket = await database.ticket.create({
          data: {
            organizationId: otherFixture.organization.id,
            requesterId: otherFixture.requester.userId,

            ticketNumber: `FOREIGN-SLA-${randomUUID()
              .slice(0, 8)
              .toUpperCase()}`,

            title: 'Foreign organization SLA ticket',
            description: 'Must never appear in the current organization.',

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

        const response = await getDashboard();

        expect(response.body.data.tickets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: ownTicket.id,
              title: 'Organization A SLA ticket',
            }),
          ]),
        );

        expect(response.body.data.tickets).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: foreignTicket.id,
              title: 'Foreign organization SLA ticket',
            }),
          ]),
        );

        expect(
          response.body.data.tickets.every(
            (ticket: { id: string }) => ticket.id !== foreignTicket.id,
          ),
        ).toBe(true);
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

    it('should count active tickets correctly', async () => {
      const now = new Date();

      const ticket = await createSlaTicket({
        title: 'Active SLA ticket',
        firstResponseMinutes: 60,
        resolutionMinutes: 240,

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });

      const response = await getDashboard({
        view: 'ACTIVE',
      });

      const body = response.body as SlaDashboardResponse;

      expect(body.data.metrics.active).toBeGreaterThanOrEqual(1);

      expect(body.data.tickets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ticket.id,
          }),
        ]),
      );
    });

    it('should count at-risk tickets when an SLA timer is inside the warning window', async () => {
      const now = new Date();

      const ticket = await createSlaTicket({
        title: 'At-risk SLA ticket',

        firstResponseMinutes: 10,
        resolutionMinutes: 60,

        firstResponseDueAt: new Date(now.getTime() + 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 30 * 60 * 1000),
      });

      const response = await getDashboard({
        view: 'AT_RISK',
      });

      const body = response.body as SlaDashboardResponse;

      expect(body.data.metrics.atRisk).toBeGreaterThanOrEqual(1);

      expect(body.data.tickets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ticket.id,
          }),
        ]),
      );
    });

    it('should count breached tickets when first response or resolution has breached', async () => {
      const now = new Date();

      const firstResponseBreached = await createSlaTicket({
        title: 'First response breached SLA ticket',

        firstResponseDueAt: new Date(now.getTime() - 30 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        firstResponseBreachedAt: new Date(now.getTime() - 20 * 60 * 1000),
      });

      const resolutionBreached = await createSlaTicket({
        title: 'Resolution breached SLA ticket',

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() - 30 * 60 * 1000),

        resolutionBreachedAt: new Date(now.getTime() - 20 * 60 * 1000),
      });

      const response = await getDashboard({
        view: 'BREACHED',
      });

      const body = response.body as SlaDashboardResponse;

      expect(body.data.metrics.breached).toBeGreaterThanOrEqual(2);

      expect(body.data.tickets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: firstResponseBreached.id,
          }),
          expect.objectContaining({
            id: resolutionBreached.id,
          }),
        ]),
      );
    });

    it('should count resolved tickets independently from breach status', async () => {
      const now = new Date();

      const resolvedCompliant = await createSlaTicket({
        title: 'Resolved compliant SLA ticket',

        firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        firstRespondedAt: new Date(now.getTime() - 90 * 60 * 1000),

        resolvedAt: new Date(now.getTime() - 30 * 60 * 1000),

        status: 'RESOLVED',
      });

      const resolvedBreached = await createSlaTicket({
        title: 'Resolved breached SLA ticket',

        firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() - 30 * 60 * 1000),

        firstRespondedAt: new Date(now.getTime() - 90 * 60 * 1000),

        resolutionBreachedAt: new Date(now.getTime() - 20 * 60 * 1000),

        resolvedAt: new Date(now.getTime() - 10 * 60 * 1000),

        status: 'RESOLVED',
      });

      const response = await getDashboard({
        view: 'RESOLVED',
      });

      const body = response.body as SlaDashboardResponse;

      expect(body.data.metrics.resolved).toBeGreaterThanOrEqual(2);

      expect(body.data.tickets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: resolvedCompliant.id,
          }),
          expect.objectContaining({
            id: resolvedBreached.id,
          }),
        ]),
      );
    });

    it('should expose first-response compliance separately from resolution compliance', async () => {
      const now = new Date();

      await createSlaTicket({
        title: 'First response compliant',

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

        firstRespondedAt: new Date(now.getTime() - 5 * 60 * 1000),
      });

      await createSlaTicket({
        title: 'First response breached',

        firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

        firstResponseBreachedAt: new Date(now.getTime() - 30 * 60 * 1000),
      });

      const response = await getDashboard();

      const body = response.body as SlaDashboardResponse;

      expect(body.data.metrics.firstResponse.completed).toBeGreaterThanOrEqual(
        1,
      );

      expect(body.data.metrics.firstResponse.compliant).toBeGreaterThanOrEqual(
        1,
      );

      expect(body.data.metrics.firstResponse.breached).toBeGreaterThanOrEqual(
        1,
      );

      expect(body.data.metrics.firstResponse.complianceRate).toEqual(
        expect.any(Number),
      );
    });

    it('should calculate resolution compliance from resolved tickets', async () => {
      const now = new Date();

      await createSlaTicket({
        title: 'Resolution compliant',

        resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        firstResponseDueAt: new Date(now.getTime() + 30 * 60 * 1000),

        resolvedAt: new Date(now.getTime() - 5 * 60 * 1000),

        status: 'RESOLVED',
      });

      await createSlaTicket({
        title: 'Resolution breached',

        resolutionDueAt: new Date(now.getTime() - 60 * 60 * 1000),

        firstResponseDueAt: new Date(now.getTime() + 30 * 60 * 1000),

        resolutionBreachedAt: new Date(now.getTime() - 30 * 60 * 1000),

        resolvedAt: new Date(now.getTime() - 10 * 60 * 1000),

        status: 'RESOLVED',
      });

      const response = await getDashboard();

      const body = response.body as SlaDashboardResponse;

      expect(body.data.metrics.resolution.completed).toBeGreaterThanOrEqual(2);

      expect(body.data.metrics.resolution.compliant).toBeGreaterThanOrEqual(1);

      expect(body.data.metrics.resolution.breached).toBeGreaterThanOrEqual(1);

      expect(body.data.metrics.resolution.complianceRate).toEqual(
        expect.any(Number),
      );
    });

    it('should support first-response-breached drill-down', async () => {
      const now = new Date();

      const ticket = await createSlaTicket({
        title: 'First response drill-down',

        firstResponseDueAt: new Date(now.getTime() - 15 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        firstResponseBreachedAt: new Date(now.getTime() - 10 * 60 * 1000),
      });

      const response = await getDashboard({
        view: 'FIRST_RESPONSE_BREACHED',
      });

      const body = response.body as SlaDashboardResponse;

      expect(body.data.tickets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ticket.id,
            firstResponse: expect.objectContaining({
              breachedAt: expect.any(String),
            }),
          }),
        ]),
      );
    });

    it('should support resolution-breached drill-down', async () => {
      const now = new Date();

      const ticket = await createSlaTicket({
        title: 'Resolution breach drill-down',

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() - 15 * 60 * 1000),

        resolutionBreachedAt: new Date(now.getTime() - 10 * 60 * 1000),
      });

      const response = await getDashboard({
        view: 'RESOLUTION_BREACHED',
      });

      const body = response.body as SlaDashboardResponse;

      expect(body.data.tickets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ticket.id,
            resolution: expect.objectContaining({
              breachedAt: expect.any(String),
            }),
          }),
        ]),
      );
    });

    it('should support priority filtering', async () => {
      const now = new Date();

      const highTicket = await createSlaTicket({
        title: 'High priority SLA ticket',
        priority: 'HIGH',

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });

      const lowTicket = await createSlaTicket({
        title: 'Low priority SLA ticket',
        priority: 'LOW',

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });

      const response = await getDashboard({
        priority: 'HIGH',
      });

      const body = response.body as SlaDashboardResponse;

      expect(body.data.tickets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: highTicket.id,
            priority: 'HIGH',
          }),
        ]),
      );

      expect(body.data.tickets).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: lowTicket.id,
          }),
        ]),
      );
    });

    it('should support created-date filtering', async () => {
      const now = new Date();

      const recentTicket = await createSlaTicket({
        title: 'Recent SLA ticket',

        createdAt: new Date(now.getTime() - 60 * 60 * 1000),

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });

      const oldTicket = await createSlaTicket({
        title: 'Old SLA ticket',

        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });

      const response = await getDashboard({
        createdFrom: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      });

      const body = response.body as SlaDashboardResponse;

      expect(body.data.tickets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: recentTicket.id,
          }),
        ]),
      );

      expect(body.data.tickets).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: oldTicket.id,
          }),
        ]),
      );
    });

    it('should paginate drill-down tickets server-side', async () => {
      const now = new Date();

      for (let index = 0; index < 3; index += 1) {
        await createSlaTicket({
          title: `Pagination SLA ticket ${index}`,

          firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

          resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        });
      }

      const response = await getDashboard({
        page: 1,
        limit: 2,
      });

      const body = response.body as SlaDashboardResponse;

      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(2);
      expect(body.data.tickets.length).toBeLessThanOrEqual(2);
      expect(body.meta.total).toBeGreaterThanOrEqual(3);
      expect(body.meta.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('should return an empty ticket list when a drill-down view has no matches', async () => {
      const response = await getDashboard({
        view: 'FIRST_RESPONSE_BREACHED',
      });

      const body = response.body as SlaDashboardResponse;

      expect(body.data.tickets).toEqual([]);
      expect(body.meta.total).toBe(0);
      expect(body.meta.totalPages).toBe(0);
    });

    it('should preserve null assignee and team values in the ticket response', async () => {
      const now = new Date();

      const ticket = await createSlaTicket({
        title: 'Null relationship SLA ticket',

        assigneeId: null,
        teamId: null,

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });

      const response = await getDashboard();

      const body = response.body as SlaDashboardResponse;

      const returnedTicket = body.data.tickets.find(
        (item) => item.id === ticket.id,
      );

      expect(returnedTicket).toBeDefined();

      expect(returnedTicket?.team).toBeNull();
      expect(returnedTicket?.assignee).toBeNull();
    });

    it('should return first-response and resolution SLA timestamps in the drill-down shape', async () => {
      const now = new Date();

      const firstResponseDueAt = new Date(now.getTime() + 60 * 60 * 1000);

      const resolutionDueAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

      const firstRespondedAt = new Date(now.getTime() - 5 * 60 * 1000);

      const ticket = await createSlaTicket({
        title: 'SLA timestamp contract',

        firstResponseDueAt,
        resolutionDueAt,
        firstRespondedAt,
      });

      const response = await getDashboard();

      const body = response.body as SlaDashboardResponse;

      const returnedTicket = body.data.tickets.find(
        (item) => item.id === ticket.id,
      );

      expect(returnedTicket).toEqual(
        expect.objectContaining({
          id: ticket.id,

          firstResponse: expect.objectContaining({
            dueAt: firstResponseDueAt.toISOString(),
            respondedAt: firstRespondedAt.toISOString(),
            breachedAt: null,
          }),

          resolution: expect.objectContaining({
            dueAt: resolutionDueAt.toISOString(),
            breachedAt: null,
          }),
        }),
      );
    });

    it('should keep summary metrics organization-scoped even when another organization has SLA tickets', async () => {
      const now = new Date();

      await createSlaTicket({
        title: 'Current organization metric ticket',

        firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

        resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });

      const otherFixture = await createOrganizationTestFixture(app);

      try {
        await database.ticket.create({
          data: {
            organizationId: otherFixture.organization.id,
            requesterId: otherFixture.requester.userId,

            ticketNumber: `FOREIGN-METRIC-${randomUUID()
              .slice(0, 8)
              .toUpperCase()}`,

            title: 'Foreign metric SLA ticket',
            description: 'Must not affect current organization metrics.',

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

        const response = await getDashboard();

        const body = response.body as SlaDashboardResponse;

        expect(body.data.metrics.total).toBe(1);
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
  });

  describe('Pagination and view contract', () => {
    const views: SlaDashboardView[] = [
      'ALL',
      'ACTIVE',
      'AT_RISK',
      'BREACHED',
      'RESOLVED',
      'FIRST_RESPONSE_BREACHED',
      'RESOLUTION_BREACHED',
    ];

    it.each(views)('should accept the %s dashboard view', async (view) => {
      const response = await getDashboard({
        view,
      });

      expect(response.status).toBe(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            metrics: expect.any(Object),
            tickets: expect.any(Array),
          }),

          meta: expect.objectContaining({
            page: 1,
            limit: 25,
            total: expect.any(Number),
            totalPages: expect.any(Number),
          }),
        }),
      );
    });

    it('should honor a custom page and limit', async () => {
      const response = await getDashboard({
        page: 2,
        limit: 10,
      });

      expect(response.body.meta.page).toBe(2);
      expect(response.body.meta.limit).toBe(10);
    });
  });
});
