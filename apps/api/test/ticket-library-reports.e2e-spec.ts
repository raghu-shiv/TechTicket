import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

describe('Ticket Library Reports API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;

  const ticketIds: string[] = [];
  const teamIds: string[] = [];
  const savedFilterIds: string[] = [];
  const otherOrganizationIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    database = app.get(DatabaseService);
    fixture = await createOrganizationTestFixture(app);
  });

  afterEach(async () => {
    if (ticketIds.length) {
      await database.ticket.deleteMany({
        where: { id: { in: [...ticketIds] } },
      });
      ticketIds.length = 0;
    }

    if (savedFilterIds.length) {
      await database.savedFilter.deleteMany({
        where: { id: { in: [...savedFilterIds] } },
      });
      savedFilterIds.length = 0;
    }

    if (teamIds.length) {
      await database.team.deleteMany({
        where: { id: { in: [...teamIds] } },
      });
      teamIds.length = 0;
    }

    if (otherOrganizationIds.length) {
      await database.organization.deleteMany({
        where: { id: { in: [...otherOrganizationIds] } },
      });
      otherOrganizationIds.length = 0;
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
      .get('/api/v1/reports/analytics/ticket-library')
      .set('x-organization-id', fixture.organization.id);
  }

  async function createTeam() {
    const team = await database.team.create({
      data: {
        organizationId: fixture.organization.id,
        name: `7-H Support ${randomUUID().slice(0, 8)}`,
        description: 'Ticket Library reports E2E team',
      },
    });

    teamIds.push(team.id);
    return team;
  }

  async function createTicket(options: {
    title: string;
    organizationId?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status?: 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';
    teamId?: string | null;
    assigneeId?: string | null;
    createdAt: Date;
  }) {
    const ticket = await database.ticket.create({
      data: {
        organizationId: options.organizationId ?? fixture.organization.id,
        requesterId: fixture.requester.userId,
        assigneeId: options.assigneeId ?? null,
        teamId: options.teamId ?? null,
        ticketNumber: `7H-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: options.title,
        description: `Ticket Library reports E2E: ${options.title}`,
        priority: options.priority ?? 'MEDIUM',
        status: options.status ?? 'OPEN',
        type: 'INCIDENT',
        createdAt: options.createdAt,
        updatedAt: options.createdAt,
      },
    });

    ticketIds.push(ticket.id);
    return ticket;
  }

  it('returns dimension counts and exact filtered counts', async () => {
    const team = await createTeam();

    await createTicket({
      title: 'High priority assigned',
      priority: 'HIGH',
      status: 'OPEN',
      teamId: team.id,
      assigneeId: fixture.agent.userId,
      createdAt: new Date('2026-01-05T10:00:00.000Z'),
    });

    await createTicket({
      title: 'Low priority unassigned',
      priority: 'LOW',
      status: 'OPEN',
      teamId: team.id,
      createdAt: new Date('2026-01-10T10:00:00.000Z'),
    });

    await createTicket({
      title: 'High priority no team',
      priority: 'HIGH',
      status: 'RESOLVED',
      createdAt: new Date('2026-01-12T10:00:00.000Z'),
    });

    const otherOrganization = await database.organization.create({
      data: {
        name: `7-H Isolation ${randomUUID()}`,
        slug: `7-h-isolation-${randomUUID()}`,
      },
    });
    otherOrganizationIds.push(otherOrganization.id);

    await createTicket({
      title: 'Foreign high priority ticket',
      organizationId: otherOrganization.id,
      priority: 'HIGH',
      createdAt: new Date('2026-01-15T10:00:00.000Z'),
    });

    const savedFilter = await database.savedFilter.create({
      data: {
        organizationId: fixture.organization.id,
        userId: fixture.owner.userId,
        name: '7-H High priority',
        description: 'E2E saved filter',
        filters: { priority: 'HIGH' },
      },
    });
    savedFilterIds.push(savedFilter.id);

    const response = await reportRequest()
      .query({
        priority: 'HIGH',
        teamId: team.id,
        createdFrom: '2026-01-01',
        createdTo: '2026-01-31',
      })
      .expect(200);

    const body = response.body as {
      data: {
        filteredCount: number;
        byPriority: Array<{ key: string; count: number }>;
        byStatus: Array<{ key: string; count: number }>;
        byDate: Array<{ date: string; count: number }>;
        savedFilters: Array<{
          id: string;
          name: string;
          count: number;
        }>;
      };
      meta: {
        organizationScoped: boolean;
      };
    };

    expect(body.data.filteredCount).toBe(1);
    expect(body.meta.organizationScoped).toBe(true);

    // The priority breakdown removes the selected priority filter,
    // while retaining the selected team and date range.
    expect(body.data.byPriority).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'HIGH', count: 1 }),
        expect.objectContaining({ key: 'LOW', count: 1 }),
      ]),
    );

    expect(body.data.byStatus).toEqual([
      expect.objectContaining({ key: 'OPEN', count: 1 }),
    ]);

    expect(body.data.byDate).toEqual([{ date: '2026-01-05', count: 1 }]);

    // Saved-filter count uses its own definition and current organization.
    expect(body.data.savedFilters).toEqual([
      expect.objectContaining({
        id: savedFilter.id,
        name: '7-H High priority',
        count: 2,
      }),
    ]);

    // The report and Ticket Library must agree on the exact same filters.
    const ticketLibraryResponse = await fixture.owner.agent
      .get('/api/v1/tickets')
      .set('x-organization-id', fixture.organization.id)
      .query({
        priority: 'HIGH',
        teamId: team.id,
        createdFrom: '2026-01-01',
        createdTo: '2026-01-31',
      })
      .expect(200);

    expect(ticketLibraryResponse.body.meta.total).toBe(body.data.filteredCount);
  });

  it('rejects an inverted creation date range', async () => {
    await reportRequest()
      .query({
        createdFrom: '2026-01-31',
        createdTo: '2026-01-01',
      })
      .expect(400);
  });
});
