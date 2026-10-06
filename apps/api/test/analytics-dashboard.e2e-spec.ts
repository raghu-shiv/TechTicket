import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';

import { createTestApp } from './helpers/app.helper.js';

import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

interface AnalyticsDashboardResponse {
  data: {
    metrics: {
      total: number;
      active: number;
      resolvedClosed: number;
      unassigned: number;

      sla: {
        tracked: number;
        breached: number;
        compliant: number;
        complianceRate: number | null;

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

      tat: {
        resolved: number;
        averageResolutionMinutes: number | null;
        medianResolutionMinutes: number | null;
      };
    };

    volumeTrend: Array<{
      date: string;
      count: number;
    }>;

    priorityDistribution: Array<{
      key: string;
      label: string;
      count: number;
      percentage: number;
    }>;

    teamWorkload: Array<{
      id: string | null;
      name: string;
      count: number;
    }>;

    assigneeWorkload: Array<{
      id: string | null;
      name: string;
      count: number;
    }>;
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

describe('Analytics Dashboard API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;

  const createdTicketIds: string[] = [];
  const createdTeamIds: string[] = [];

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

    if (createdTeamIds.length > 0) {
      await database.team.deleteMany({
        where: {
          id: {
            in: createdTeamIds,
          },
        },
      });

      createdTeamIds.length = 0;
    }
  });

  afterAll(async () => {
    if (fixture) {
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
    }

    await app.close();
  });

  function dashboardRequest() {
    return fixture.owner.agent
      .get('/api/v1/reports/analytics/dashboard')
      .set('x-organization-id', fixture.organization.id);
  }

  async function createTicket(options: {
    title: string;

    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

    status?: 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';

    type?: 'INCIDENT' | 'SERVICE_REQUEST' | 'QUESTION' | 'PROBLEM';

    requesterId?: string;

    assigneeId?: string | null;

    teamId?: string | null;

    createdAt?: Date;

    updatedAt?: Date;

    resolvedAt?: Date | null;

    closedAt?: Date | null;

    sla?: {
      firstResponseMinutes?: number;
      resolutionMinutes?: number;

      firstResponseDueAt: Date;

      resolutionDueAt: Date;

      firstRespondedAt?: Date | null;

      firstResponseBreachedAt?: Date | null;

      resolutionBreachedAt?: Date | null;
    };
  }) {
    const now = new Date();

    const ticket = await database.ticket.create({
      data: {
        organizationId: fixture.organization.id,

        requesterId: options.requesterId ?? fixture.requester.userId,

        assigneeId:
          options.assigneeId === undefined ? null : options.assigneeId,

        teamId: options.teamId === undefined ? null : options.teamId,

        ticketNumber: `ANALYTICS-${randomUUID().slice(0, 8).toUpperCase()}`,

        title: options.title,

        description: `Analytics dashboard test ticket: ${options.title}`,

        status: options.status ?? 'OPEN',

        priority: options.priority ?? 'MEDIUM',

        type: options.type ?? 'INCIDENT',

        createdAt: options.createdAt ?? now,

        updatedAt: options.updatedAt ?? now,

        resolvedAt: options.resolvedAt ?? null,

        closedAt: options.closedAt ?? null,

        ...(options.sla
          ? {
              sla: {
                create: {
                  firstResponseMinutes: options.sla.firstResponseMinutes ?? 60,

                  resolutionMinutes: options.sla.resolutionMinutes ?? 240,

                  firstResponseDueAt: options.sla.firstResponseDueAt,

                  resolutionDueAt: options.sla.resolutionDueAt,

                  firstRespondedAt: options.sla.firstRespondedAt ?? null,

                  firstResponseBreachedAt:
                    options.sla.firstResponseBreachedAt ?? null,

                  resolutionBreachedAt:
                    options.sla.resolutionBreachedAt ?? null,
                },
              },
            }
          : {}),
      },

      include: {
        sla: true,
      },
    });

    createdTicketIds.push(ticket.id);

    return ticket;
  }

  async function createTeam(name: string) {
    const team = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `${name} ${randomUUID().slice(0, 6)}`,
        description: 'Analytics dashboard E2E test team',
      },
    });

    createdTeamIds.push(team.id);

    return team;
  }

  describe('GET /api/v1/reports/analytics/dashboard', () => {
    it('should return the complete dashboard response shape', async () => {
      const now = new Date();

      await createTicket({
        title: 'Dashboard contract ticket',
        sla: {
          firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),
          resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        },
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            metrics: expect.objectContaining({
              total: expect.any(Number),
              active: expect.any(Number),
              resolvedClosed: expect.any(Number),
              unassigned: expect.any(Number),

              sla: expect.objectContaining({
                tracked: expect.any(Number),
                breached: expect.any(Number),
                compliant: expect.any(Number),
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

              tat: expect.objectContaining({
                resolved: expect.any(Number),
              }),
            }),

            volumeTrend: expect.any(Array),
            priorityDistribution: expect.any(Array),
            teamWorkload: expect.any(Array),
            assigneeWorkload: expect.any(Array),
          }),

          meta: expect.objectContaining({
            query: expect.objectContaining({
              dateField: 'createdAt',
              organizationScoped: true,
              queryVersion: 1,
            }),
          }),
        }),
      );

      expect(
        body.data.metrics.sla.complianceRate === null ||
          typeof body.data.metrics.sla.complianceRate === 'number',
      ).toBe(true);

      expect(
        body.data.metrics.sla.firstResponse.complianceRate === null ||
          typeof body.data.metrics.sla.firstResponse.complianceRate ===
            'number',
      ).toBe(true);

      expect(
        body.data.metrics.sla.resolution.complianceRate === null ||
          typeof body.data.metrics.sla.resolution.complianceRate === 'number',
      ).toBe(true);

      expect(
        body.data.metrics.tat.averageResolutionMinutes === null ||
          typeof body.data.metrics.tat.averageResolutionMinutes === 'number',
      ).toBe(true);

      expect(
        body.data.metrics.tat.medianResolutionMinutes === null ||
          typeof body.data.metrics.tat.medianResolutionMinutes === 'number',
      ).toBe(true);
    });

    it('should count total tickets correctly', async () => {
      await createTicket({
        title: 'Total ticket one',
      });

      await createTicket({
        title: 'Total ticket two',
      });

      await createTicket({
        title: 'Total ticket three',
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.metrics.total).toBe(3);
    });

    it('should count active tickets correctly', async () => {
      await createTicket({
        title: 'Open ticket',
        status: 'OPEN',
      });

      await createTicket({
        title: 'In progress ticket',
        status: 'IN_PROGRESS',
      });

      await createTicket({
        title: 'Pending ticket',
        status: 'PENDING',
      });

      await createTicket({
        title: 'Resolved ticket',
        status: 'RESOLVED',
        resolvedAt: new Date(),
      });

      await createTicket({
        title: 'Closed ticket',
        status: 'CLOSED',
        resolvedAt: new Date(),
        closedAt: new Date(),
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.metrics.total).toBe(5);

      expect(body.data.metrics.active).toBe(3);
    });

    it('should count resolved and closed tickets correctly', async () => {
      await createTicket({
        title: 'Resolved ticket',
        status: 'RESOLVED',
        resolvedAt: new Date(),
      });

      await createTicket({
        title: 'Closed ticket',
        status: 'CLOSED',
        resolvedAt: new Date(),
        closedAt: new Date(),
      });

      await createTicket({
        title: 'Open ticket',
        status: 'OPEN',
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.metrics.resolvedClosed).toBe(2);
    });

    it('should count unassigned tickets correctly', async () => {
      const assignedTicket = await createTicket({
        title: 'Assigned ticket',
        assigneeId: fixture.agent.userId,
      });

      const unassignedTicket = await createTicket({
        title: 'Unassigned ticket',
        assigneeId: null,
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.metrics.unassigned).toBe(1);

      expect(assignedTicket.assigneeId).toBe(fixture.agent.userId);

      expect(unassignedTicket.assigneeId).toBeNull();
    });

    it('should apply date filtering', async () => {
      const now = new Date();

      const recentTicket = await createTicket({
        title: 'Recent analytics ticket',
        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
      });

      const oldTicket = await createTicket({
        title: 'Old analytics ticket',
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      });

      const response = await dashboardRequest()
        .query({
          from: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        })
        .expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.metrics.total).toBe(1);

      expect(recentTicket.id).toBeTruthy();

      expect(oldTicket.id).toBeTruthy();

      expect(body.meta.query.dateFrom).toBeTruthy();
    });

    it('should support updatedAt as the dashboard date field', async () => {
      const now = new Date();

      await createTicket({
        title: 'Updated date field ticket',
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 30 * 60 * 1000),
      });

      const response = await dashboardRequest()
        .query({
          dateField: 'updatedAt',
          from: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        })
        .expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.meta.query.dateField).toBe('updatedAt');

      expect(body.data.metrics.total).toBe(1);
    });

    it('should return priority distribution correctly', async () => {
      await createTicket({
        title: 'Low priority ticket',
        priority: 'LOW',
      });

      await createTicket({
        title: 'High priority ticket one',
        priority: 'HIGH',
      });

      await createTicket({
        title: 'High priority ticket two',
        priority: 'HIGH',
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.priorityDistribution).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'LOW',
            count: 1,
          }),

          expect.objectContaining({
            key: 'HIGH',
            count: 2,
          }),
        ]),
      );

      const totalDistributionCount = body.data.priorityDistribution.reduce(
        (sum, item) => sum + item.count,
        0,
      );

      expect(totalDistributionCount).toBe(3);
    });

    it('should return ticket volume grouped by day', async () => {
      const now = new Date();

      await createTicket({
        title: 'Today volume ticket one',
        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
      });

      await createTicket({
        title: 'Today volume ticket two',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.volumeTrend.length).toBeGreaterThan(0);

      expect(
        body.data.volumeTrend.reduce((sum, point) => sum + point.count, 0),
      ).toBe(2);

      expect(body.data.volumeTrend[0]?.date).toEqual(expect.any(String));
    });

    it('should return team workload correctly', async () => {
      const team = await createTeam('Analytics Support');

      await createTicket({
        title: 'Team workload ticket one',
        teamId: team.id,
      });

      await createTicket({
        title: 'Team workload ticket two',
        teamId: team.id,
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.teamWorkload).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: team.id,
            name: team.name,
            count: 2,
          }),
        ]),
      );
    });

    it('should return assignee workload correctly', async () => {
      await createTicket({
        title: 'Assignee workload one',
        assigneeId: fixture.agent.userId,
      });

      await createTicket({
        title: 'Assignee workload two',
        assigneeId: fixture.agent.userId,
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.assigneeWorkload).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: fixture.agent.userId,
            count: 2,
          }),
        ]),
      );
    });

    it('should calculate SLA metrics correctly', async () => {
      const now = new Date();

      await createTicket({
        title: 'SLA compliant ticket',
        sla: {
          firstResponseDueAt: new Date(now.getTime() + 60 * 60 * 1000),

          resolutionDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),

          firstRespondedAt: new Date(now.getTime() - 5 * 60 * 1000),
        },
      });

      await createTicket({
        title: 'SLA breached ticket',
        sla: {
          firstResponseDueAt: new Date(now.getTime() - 60 * 60 * 1000),

          resolutionDueAt: new Date(now.getTime() - 30 * 60 * 1000),

          firstResponseBreachedAt: new Date(now.getTime() - 45 * 60 * 1000),

          resolutionBreachedAt: new Date(now.getTime() - 20 * 60 * 1000),
        },
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.metrics.sla.tracked).toBe(2);

      expect(body.data.metrics.sla.breached).toBe(1);

      expect(body.data.metrics.sla.compliant).toBe(1);

      expect(body.data.metrics.sla.complianceRate).toBe(50);

      expect(body.data.metrics.sla.firstResponse.completed).toBe(1);

      expect(body.data.metrics.sla.firstResponse.compliant).toBe(1);

      expect(body.data.metrics.sla.firstResponse.breached).toBe(1);

      expect(body.data.metrics.sla.firstResponse.complianceRate).toBe(100);

      expect(body.data.metrics.sla.resolution.breached).toBe(1);
    });

    it('should calculate resolution TAT correctly', async () => {
      const now = new Date();

      await createTicket({
        title: 'One hour resolution',
        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
        resolvedAt: new Date(now.getTime() - 30 * 60 * 1000),
        status: 'RESOLVED',
      });

      await createTicket({
        title: 'Two hour resolution',
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        resolvedAt: new Date(now.getTime() - 60 * 60 * 1000),
        status: 'RESOLVED',
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.metrics.tat.resolved).toBe(2);

      expect(body.data.metrics.tat.averageResolutionMinutes).toBeCloseTo(75, 0);

      expect(body.data.metrics.tat.medianResolutionMinutes).toBeCloseTo(75, 0);
    });

    it('should support combined dashboard filters', async () => {
      await createTicket({
        title: 'Matching filtered ticket',
        priority: 'HIGH',
        status: 'OPEN',
        type: 'INCIDENT',
      });

      await createTicket({
        title: 'Wrong priority ticket',
        priority: 'LOW',
        status: 'OPEN',
        type: 'INCIDENT',
      });

      await createTicket({
        title: 'Wrong status ticket',
        priority: 'HIGH',
        status: 'RESOLVED',
        type: 'INCIDENT',
        resolvedAt: new Date(),
      });

      const response = await dashboardRequest()
        .query({
          priority: 'HIGH',
          status: 'OPEN',
          type: 'INCIDENT',
        })
        .expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.metrics.total).toBe(1);

      expect(body.data.priorityDistribution).toEqual([
        expect.objectContaining({
          key: 'HIGH',
          count: 1,
        }),
      ]);
    });

    it('should return empty analytics for a valid range with no matching tickets', async () => {
      const now = new Date();

      const response = await dashboardRequest()
        .query({
          from: new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),

          to: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(200);

      const body = response.body as AnalyticsDashboardResponse;

      expect(body.data.metrics.total).toBe(0);

      expect(body.data.metrics.active).toBe(0);

      expect(body.data.metrics.resolvedClosed).toBe(0);

      expect(body.data.metrics.unassigned).toBe(0);

      expect(body.data.metrics.sla.tracked).toBe(0);

      expect(body.data.metrics.sla.complianceRate).toBeNull();

      expect(body.data.metrics.tat.averageResolutionMinutes).toBeNull();

      expect(body.data.metrics.tat.medianResolutionMinutes).toBeNull();

      expect(body.data.volumeTrend).toEqual([]);

      expect(body.data.priorityDistribution).toEqual([]);

      expect(body.data.assigneeWorkload).toEqual([]);

      expect(body.data.teamWorkload).toEqual([]);
    });

    it('should not expose tickets or aggregates from another organization', async () => {
      const ownTicket = await createTicket({
        title: 'Current organization analytics ticket',
        priority: 'HIGH',
      });

      const otherFixture = await createOrganizationTestFixture(app);

      try {
        const foreignTicket = await database.ticket.create({
          data: {
            organizationId: otherFixture.organization.id,

            requesterId: otherFixture.requester.userId,

            ticketNumber: `FOREIGN-ANALYTICS-${randomUUID()
              .slice(0, 8)
              .toUpperCase()}`,

            title: 'Foreign organization analytics ticket',

            description:
              'This ticket must never affect another organization dashboard.',

            status: 'OPEN',

            priority: 'URGENT',

            type: 'INCIDENT',
          },
        });

        const response = await dashboardRequest().expect(200);

        const body = response.body as AnalyticsDashboardResponse;

        expect(body.data.metrics.total).toBe(1);

        expect(body.data.priorityDistribution).toEqual([
          expect.objectContaining({
            key: 'HIGH',
            count: 1,
          }),
        ]);

        expect(body.data.priorityDistribution).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              key: 'URGENT',
              count: 1,
            }),
          ]),
        );

        expect(ownTicket.organizationId).toBe(fixture.organization.id);

        expect(foreignTicket.organizationId).toBe(otherFixture.organization.id);
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

    it('should reject an invalid date range', async () => {
      const now = new Date();

      await dashboardRequest()
        .query({
          from: now.toISOString(),
          to: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        })
        .expect(400);
    });

    it('should reject an invalid status', async () => {
      await dashboardRequest()
        .query({
          status: 'NOT_A_STATUS',
        })
        .expect(400);
    });

    it('should reject an invalid priority', async () => {
      await dashboardRequest()
        .query({
          priority: 'NOT_A_PRIORITY',
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      const request = app.getHttpServer();

      const response = await import('supertest').then(
        ({ default: supertest }) =>
          supertest(request)
            .get('/api/v1/reports/analytics/dashboard')
            .set('x-organization-id', fixture.organization.id),
      );

      expect(response.status).toBe(401);
    });
  });
});
