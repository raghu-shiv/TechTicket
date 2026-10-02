import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

describe('SavedFilter persistence (foundation)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);

    fixture = await createOrganizationTestFixture(app);
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

  it('should persist a saved ticket query definition without page state', async () => {
    const savedFilter = await database.savedFilter.create({
      data: {
        organizationId: fixture.organization.id,
        userId: fixture.agent.userId,
        name: 'High priority incidents',
        description: 'Open high-priority incidents assigned to me.',
        filters: {
          search: '',
          status: 'OPEN',
          priority: 'HIGH',
          type: 'INCIDENT',
          assigneeId: fixture.agent.userId,
          teamId: undefined,
          requesterId: undefined,
          unassigned: false,
          unassignedTeam: false,
          createdFrom: undefined,
          createdTo: undefined,
          updatedFrom: undefined,
          updatedTo: undefined,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          limit: 20,
        },
      },
    });

    expect(savedFilter).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        organizationId: fixture.organization.id,
        userId: fixture.agent.userId,
        name: 'High priority incidents',
        description: 'Open high-priority incidents assigned to me.',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );

    expect(savedFilter.filters).toEqual(
      expect.objectContaining({
        search: '',
        status: 'OPEN',
        priority: 'HIGH',
        type: 'INCIDENT',
        assigneeId: fixture.agent.userId,
        unassigned: false,
        unassignedTeam: false,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 20,
      }),
    );

    expect(savedFilter.filters).not.toHaveProperty('page');
  });

  it('should scope saved filters to the organization and user', async () => {
    const first = await database.savedFilter.create({
      data: {
        organizationId: fixture.organization.id,
        userId: fixture.agent.userId,
        name: 'Agent filter',
        filters: {
          status: 'OPEN',
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          limit: 20,
        },
      },
    });

    const second = await database.savedFilter.create({
      data: {
        organizationId: fixture.organization.id,
        userId: fixture.requester.userId,
        name: 'Requester filter',
        filters: {
          status: 'PENDING',
          sortBy: 'createdAt',
          sortOrder: 'asc',
          limit: 20,
        },
      },
    });

    const agentFilters = await database.savedFilter.findMany({
      where: {
        organizationId: fixture.organization.id,
        userId: fixture.agent.userId,
      },
    });

    expect(agentFilters.map((filter) => filter.id)).toContain(first.id);
    expect(agentFilters.map((filter) => filter.id)).not.toContain(second.id);
  });
});
