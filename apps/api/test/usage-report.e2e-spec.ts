import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

interface UsageReportResponse {
  summary: {
    ticketsCreated: number;
    activitiesRecorded: number;
    commentsCreated: number;
    attachmentsUploaded: number;
    approvalRequests: number;
    approvalsApproved: number;
    approvalsRejected: number;
    activeUsers: number;
    activeAgents: number;
  };
  trends: Array<{
    date: string;
    ticketsCreated: number;
    activitiesRecorded: number;
    commentsCreated: number;
    attachmentsUploaded: number;
    approvalRequests: number;
  }>;
  period: {
    from: string | null;
    to: string | null;
  };
  metricAvailability: {
    notifications: 'unavailable' | 'available';
  };
}

describe('Usage Reports API (e2e)', () => {
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
        where: { id: { in: [...createdTicketIds] } },
      });

      createdTicketIds.length = 0;
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
      .get('/api/v1/reports/analytics/usage')
      .set('x-organization-id', fixture.organization.id);
  }

  async function createTicket(options: {
    title: string;
    createdAt?: Date;
    organizationId?: string;
  }) {
    const createdAt = options.createdAt ?? new Date();

    const ticket = await database.ticket.create({
      data: {
        organizationId: options.organizationId ?? fixture.organization.id,
        requesterId: fixture.requester.userId,
        ticketNumber: `USAGE-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: options.title,
        description: `Usage report E2E ticket: ${options.title}`,
        status: 'OPEN',
        priority: 'MEDIUM',
        type: 'INCIDENT',
        createdAt,
        updatedAt: createdAt,
      },
    });

    createdTicketIds.push(ticket.id);

    return ticket;
  }

  it('returns the expected response contract and organization-scoped metrics', async () => {
    const response = await reportRequest().expect(200);
    const body = response.body as UsageReportResponse;

    expect(body).toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({
          ticketsCreated: expect.any(Number),
          activitiesRecorded: expect.any(Number),
          commentsCreated: expect.any(Number),
          attachmentsUploaded: expect.any(Number),
          approvalRequests: expect.any(Number),
          approvalsApproved: expect.any(Number),
          approvalsRejected: expect.any(Number),
          activeUsers: expect.any(Number),
          activeAgents: expect.any(Number),
        }),
        trends: expect.any(Array),

        metricAvailability: expect.objectContaining({
          notifications: expect.stringMatching(/^(unavailable|available)$/),
        }),
      }),
    );

    expect(
      body.period.from === null || typeof body.period.from === 'string',
    ).toBe(true);

    expect(body.period.to === null || typeof body.period.to === 'string').toBe(
      true,
    );

    for (const value of Object.values(body.summary)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }

    for (const point of body.trends) {
      expect(point.date).toEqual(expect.any(String));

      for (const value of [
        point.ticketsCreated,
        point.activitiesRecorded,
        point.commentsCreated,
        point.attachmentsUploaded,
        point.approvalRequests,
      ]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('counts tickets created in the selected date range', async () => {
    await createTicket({
      title: 'Usage report ticket within range',
      createdAt: new Date('2026-09-15T12:00:00.000Z'),
    });

    await createTicket({
      title: 'Usage report ticket outside range',
      createdAt: new Date('2026-08-15T12:00:00.000Z'),
    });

    const response = await reportRequest()
      .query({
        from: '2026-09-01',
        to: '2026-09-30',
      })
      .expect(200);

    const body = response.body as UsageReportResponse;

    expect(body.summary.ticketsCreated).toBe(1);
    expect(body.period.from).toContain('2026-09-01');
    expect(body.period.to).toContain('2026-09-30');
  });

  it('returns zero counts and an empty trend for an empty date range', async () => {
    const response = await reportRequest()
      .query({
        from: '2020-01-01',
        to: '2020-01-07',
      })
      .expect(200);

    const body = response.body as UsageReportResponse;

    expect(body.summary.ticketsCreated).toBe(0);
    expect(body.summary.activitiesRecorded).toBe(0);
    expect(body.summary.commentsCreated).toBe(0);
    expect(body.summary.attachmentsUploaded).toBe(0);
    expect(body.summary.approvalRequests).toBe(0);
    expect(body.summary.approvalsApproved).toBe(0);
    expect(body.summary.approvalsRejected).toBe(0);
    expect(body.summary.activeUsers).toBe(0);
    expect(body.summary.activeAgents).toBe(0);
    expect(body.trends).toHaveLength(7);

    expect(body.trends.map((point) => point.date)).toEqual([
      '2020-01-01',
      '2020-01-02',
      '2020-01-03',
      '2020-01-04',
      '2020-01-05',
      '2020-01-06',
      '2020-01-07',
    ]);

    for (const point of body.trends) {
      expect(point.ticketsCreated).toBe(0);
      expect(point.activitiesRecorded).toBe(0);
      expect(point.commentsCreated).toBe(0);
      expect(point.attachmentsUploaded).toBe(0);
      expect(point.approvalRequests).toBe(0);
    }
  });

  it('rejects a date range where from is later than to', async () => {
    await reportRequest()
      .query({
        from: '2026-09-30',
        to: '2026-09-01',
      })
      .expect(400);
  });

  it('does not claim notification counts are available when they are not persisted', async () => {
    const response = await reportRequest().expect(200);
    const body = response.body as UsageReportResponse;

    expect(body.metricAvailability.notifications).toBe('unavailable');
  });
});
