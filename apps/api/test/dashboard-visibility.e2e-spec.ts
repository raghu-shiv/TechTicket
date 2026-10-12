import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

describe('Operational dashboard role visibility (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;
  const createdTicketIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    database = app.get(DatabaseService);
    fixture = await createOrganizationTestFixture(app);
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await database.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }

    if (fixture) {
      await database.organization.delete({
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

    await app.close();
  });

  it('limits requester dashboard aggregates and recent-ticket lists to their own tickets', async () => {
    const requesterTicket = await database.ticket.create({
      data: {
        organizationId: fixture.organization.id,
        requesterId: fixture.requester.userId,
        ticketNumber: `UI3-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: 'Requester-owned operational dashboard ticket',
        description: 'Created for dashboard requester-scope coverage.',
        status: 'OPEN',
        priority: 'URGENT',
        type: 'INCIDENT',
      },
      select: { id: true, ticketNumber: true },
    });
    createdTicketIds.push(requesterTicket.id);

    const otherUserTicket = await database.ticket.create({
      data: {
        organizationId: fixture.organization.id,
        requesterId: fixture.agent.userId,
        ticketNumber: `UI3-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: 'Other-user operational dashboard ticket',
        description: 'Must not appear in a requester-scoped dashboard.',
        status: 'OPEN',
        priority: 'LOW',
        type: 'INCIDENT',
      },
      select: { id: true, ticketNumber: true },
    });
    createdTicketIds.push(otherUserTicket.id);

    const requesterDashboard = await fixture.requester.agent
      .get('/api/v1/reports/analytics/dashboard')
      .query({ requesterId: fixture.agent.userId })
      .set('x-organization-id', fixture.organization.id)
      .expect(200);

    expect(requesterDashboard.body.data.metrics.total).toBe(1);
    expect(requesterDashboard.body.data.priorityDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'URGENT', count: 1 }),
      ]),
    );
    expect(
      requesterDashboard.body.data.priorityDistribution.find(
        (point: { key: string }) => point.key === 'LOW',
      )?.count ?? 0,
    ).toBe(0);

    // Even a requester's attempt to specify another member as requester must
    // remain constrained to the authenticated user's own ticket list.
    const requesterTickets = await fixture.requester.agent
      .get('/api/v1/tickets')
      .query({ requesterId: fixture.agent.userId, page: 1, limit: 100 })
      .set('x-organization-id', fixture.organization.id)
      .expect(200);

    expect(requesterTickets.body.meta.total).toBe(1);
    expect(requesterTickets.body.data.map((ticket: { id: string }) => ticket.id)).toEqual([
      requesterTicket.id,
    ]);

    const agentDashboard = await fixture.agent.agent
      .get('/api/v1/reports/analytics/dashboard')
      .set('x-organization-id', fixture.organization.id)
      .expect(200);

    expect(agentDashboard.body.data.metrics.total).toBe(2);
  });
});
