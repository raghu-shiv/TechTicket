import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

describe('Employee Dashboard API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;
  const createdTicketIds: string[] = [];
  const temporaryFixtures: OrganizationTestFixture[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    database = app.get(DatabaseService);
    fixture = await createOrganizationTestFixture(app);
  });

  afterEach(async () => {
    if (createdTicketIds.length > 0) {
      await database.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
      createdTicketIds.length = 0;
    }

    while (temporaryFixtures.length > 0) {
      const temporary = temporaryFixtures.pop();
      if (!temporary) continue;
      await database.organization.delete({
        where: { id: temporary.organization.id },
      });
      await database.user.deleteMany({
        where: {
          id: {
            in: [
              temporary.owner.userId,
              temporary.admin.userId,
              temporary.agent.userId,
              temporary.requester.userId,
            ],
          },
        },
      });
    }
  });

  afterAll(async () => {
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

  function reportRequest(
    user:
      | OrganizationTestFixture['owner']
      | OrganizationTestFixture['agent']
      | OrganizationTestFixture['admin']
      | OrganizationTestFixture['requester'],
  ) {
    return user.agent
      .get('/api/v1/reports/analytics/employees')
      .set('x-organization-id', fixture.organization.id);
  }

  async function createAssignedTicket(options: {
    title: string;
    status: TicketStatus;
  }) {
    const createdAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const resolvedAt =
      options.status === 'RESOLVED'
        ? new Date(createdAt.getTime() + 30 * 60 * 1000)
        : null;
    const id = randomUUID();

    const ticket = await database.ticket.create({
      data: {
        id,
        ticketNumber: `ED-${randomUUID().slice(0, 8)}`,
        organizationId: fixture.organization.id,
        requesterId: fixture.requester.userId,
        assigneeId: fixture.agent.userId,
        title: options.title,
        description: `Test ticket for ${options.title}`,
        status: options.status,
        priority: 'HIGH',
        type: 'INCIDENT',
        createdAt,
        updatedAt: new Date(),
        resolvedAt,
        closedAt: null,
      },
    });
    createdTicketIds.push(ticket.id);

    await database.ticketSla.create({
      data: {
        id: randomUUID(),
        ticketId: ticket.id,
        firstResponseMinutes: 60,
        resolutionMinutes: 120,
        firstResponseDueAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
        resolutionDueAt: new Date(createdAt.getTime() + 120 * 60 * 1000),
        firstRespondedAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
        firstResponseBreachedAt: null,
        resolutionBreachedAt: null,
        createdAt,
        updatedAt: new Date(),
      },
    });

    return ticket;
  }

  it('returns metrics and workload distribution scoped to the active organization', async () => {
    await createAssignedTicket({
      title: 'Open employee ticket',
      status: 'OPEN',
    });
    await createAssignedTicket({
      title: 'In-progress employee ticket',
      status: 'IN_PROGRESS',
    });
    const resolved = await createAssignedTicket({
      title: 'Resolved employee ticket',
      status: 'RESOLVED',
    });

    // The persisted status-change metadata is the source of truth for reopen counts.
    await database.ticketActivity.create({
      data: {
        id: randomUUID(),
        ticketId: resolved.id,
        organizationId: fixture.organization.id,
        actorId: fixture.agent.userId,
        type: 'STATUS_CHANGED',
        metadata: { from: 'RESOLVED', to: 'IN_PROGRESS' },
        createdAt: new Date(),
      },
    });

    // Model current state after reopening; resolution timestamps are cleared by the
    // existing TicketsService when a resolved ticket re-enters an active state.
    await database.ticket.update({
      where: { id: resolved.id },
      data: { status: 'IN_PROGRESS', resolvedAt: null, closedAt: null },
    });

    const response = await reportRequest(fixture.owner).expect(200);

    expect(response.body.meta.organizationScoped).toBe(true);
    expect(response.body.meta.accessScope).toBe('ORGANIZATION');
    expect(response.body.data.metrics.ticketCount).toBe(3);
    expect(response.body.data.metrics.assignedTickets).toBe(3);
    expect(response.body.data.metrics.openWorkload).toBe(3);
    expect(response.body.data.metrics.resolvedTickets).toBe(0);
    expect(response.body.data.metrics.currentWorkload).toBe(3);
    expect(response.body.data.metrics.reopenedTickets).toBe(1);
    expect(response.body.data.metrics.averageFirstResponseMinutes).toBe(15);
    expect(response.body.data.workloadDistribution).toEqual([
      expect.objectContaining({ id: fixture.agent.userId, count: 3 }),
    ]);
    expect(response.body.data.availableEmployees).toEqual([
      expect.objectContaining({ id: fixture.agent.userId }),
    ]);
  });

  it('isolates workload metrics and employee selection to the active organization', async () => {
    await createAssignedTicket({
      title: 'Local organization ticket',
      status: 'OPEN',
    });

    const foreignFixture = await createOrganizationTestFixture(app);
    temporaryFixtures.push(foreignFixture);

    const foreignTicket = await database.ticket.create({
      data: {
        id: randomUUID(),
        ticketNumber: `ED-${randomUUID().slice(0, 8)}`,
        organizationId: foreignFixture.organization.id,
        requesterId: foreignFixture.requester.userId,
        assigneeId: foreignFixture.agent.userId,
        title: 'Foreign organization ticket',
        description: 'Must not be included in active organization analytics',
        status: 'OPEN',
        priority: 'HIGH',
        type: 'INCIDENT',
      },
    });
    createdTicketIds.push(foreignTicket.id);

    const response = await reportRequest(fixture.owner).expect(200);
    expect(response.body.data.metrics.ticketCount).toBe(1);
    expect(response.body.data.metrics.currentWorkload).toBe(1);
    expect(response.body.data.workloadDistribution).toEqual([
      expect.objectContaining({ id: fixture.agent.userId, count: 1 }),
    ]);

    await reportRequest(fixture.owner)
      .query({ employeeId: foreignFixture.agent.userId })
      .expect(404);
  });

  it('restricts AGENT responses to the authenticated employee only', async () => {
    await createAssignedTicket({ title: 'Self-only ticket', status: 'OPEN' });

    const response = await reportRequest(fixture.agent).expect(200);

    expect(response.body.meta.accessScope).toBe('SELF');
    expect(response.body.meta.employeeId).toBe(fixture.agent.userId);
    expect(response.body.data.availableEmployees).toEqual([]);
    expect(response.body.data.teamComparison).toEqual([]);
    expect(response.body.data.workloadDistribution).toHaveLength(1);
    expect(response.body.data.workloadDistribution[0].id).toBe(
      fixture.agent.userId,
    );

    await reportRequest(fixture.agent)
      .query({ employeeId: fixture.owner.userId })
      .expect(403);
  });

  it('denies REQUESTER access and does not allow selecting non-agent members', async () => {
    await reportRequest(fixture.requester).expect(403);

    await reportRequest(fixture.owner)
      .query({ employeeId: fixture.requester.userId })
      .expect(404);
  });

  it('rejects inverted date ranges', async () => {
    await reportRequest(fixture.owner)
      .query({
        from: '2026-10-10T00:00:00.000Z',
        to: '2026-10-01T00:00:00.000Z',
      })
      .expect(400);
  });
});
