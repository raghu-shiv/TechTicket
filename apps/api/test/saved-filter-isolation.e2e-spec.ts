import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

describe('SavedFilter CRUD + isolation (e2e)', () => {
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

  describe('Create', () => {
    it('should create a saved filter for the authenticated user in the current organization', async () => {
      const response = await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'High Priority Incidents',
          description: 'High priority incident queue.',
          filters: {
            search: 'vpn',
            status: 'OPEN',
            priority: 'HIGH',
            type: 'INCIDENT',
            sortBy: 'updatedAt',
            sortOrder: 'desc',
            limit: 20,
          },
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          organizationId: fixture.organization.id,
          userId: fixture.agent.userId,
          name: 'High Priority Incidents',
          description: 'High priority incident queue.',
          filters: expect.objectContaining({
            search: 'vpn',
            status: 'OPEN',
            priority: 'HIGH',
            type: 'INCIDENT',
            sortBy: 'updatedAt',
            sortOrder: 'desc',
            limit: 20,
          }),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );

      expect(response.body.filters).not.toHaveProperty('page');
    });
  });

  describe('Read isolation', () => {
    it('should allow the same user in the same organization to access the saved filter', async () => {
      const createResponse = await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Same User Same Organization',
          filters: {
            status: 'OPEN',
            sortBy: 'updatedAt',
            sortOrder: 'desc',
            limit: 20,
          },
        })
        .expect(201);

      const savedFilterId = createResponse.body.id;

      const response = await fixture.agent.agent
        .get(`/api/v1/saved-filters/${savedFilterId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: savedFilterId,
          organizationId: fixture.organization.id,
          userId: fixture.agent.userId,
          name: 'Same User Same Organization',
        }),
      );
    });

    it('should not allow a different user in the same organization to access the saved filter', async () => {
      const createResponse = await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Agent Private Filter',
          filters: {
            status: 'OPEN',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: 20,
          },
        })
        .expect(201);

      const savedFilterId = createResponse.body.id;

      await fixture.requester.agent
        .get(`/api/v1/saved-filters/${savedFilterId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(404);
    });

    it('should not allow the same user in a different organization to access the saved filter', async () => {
      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        const createResponse = await fixture.agent.agent
          .post('/api/v1/saved-filters')
          .set('x-organization-id', fixture.organization.id)
          .send({
            name: 'Organization Private Filter',
            filters: {
              status: 'OPEN',
              sortBy: 'updatedAt',
              sortOrder: 'desc',
              limit: 20,
            },
          })
          .expect(201);

        const savedFilterId = createResponse.body.id;

        /*
         * The authenticated user is not a member of the foreign
         * organization, so OrganizationGuard must reject the request
         * before SavedFilterService is reached.
         */
        await fixture.agent.agent
          .get(`/api/v1/saved-filters/${savedFilterId}`)
          .set('x-organization-id', foreignFixture.organization.id)
          .expect(403);
      } finally {
        await database.organization.delete({
          where: {
            id: foreignFixture.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                foreignFixture.owner.userId,
                foreignFixture.admin.userId,
                foreignFixture.agent.userId,
                foreignFixture.requester.userId,
              ],
            },
          },
        });
      }
    });

    it('should not allow a different user in a different organization to access the saved filter', async () => {
      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        const createResponse = await fixture.agent.agent
          .post('/api/v1/saved-filters')
          .set('x-organization-id', fixture.organization.id)
          .send({
            name: 'Cross Organization Filter',
            filters: {
              status: 'PENDING',
              sortBy: 'createdAt',
              sortOrder: 'asc',
              limit: 20,
            },
          })
          .expect(201);

        const savedFilterId = createResponse.body.id;

        await foreignFixture.requester.agent
          .get(`/api/v1/saved-filters/${savedFilterId}`)
          .set('x-organization-id', foreignFixture.organization.id)
          .expect(404);
      } finally {
        await database.organization.delete({
          where: {
            id: foreignFixture.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                foreignFixture.owner.userId,
                foreignFixture.admin.userId,
                foreignFixture.agent.userId,
                foreignFixture.requester.userId,
              ],
            },
          },
        });
      }
    });

    it('should list only saved filters belonging to the authenticated user in the current organization', async () => {
      const agentFilter = await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Agent Only',
          filters: {
            status: 'OPEN',
            sortBy: 'updatedAt',
            sortOrder: 'desc',
            limit: 20,
          },
        })
        .expect(201);

      const requesterFilter = await fixture.requester.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Requester Only',
          filters: {
            status: 'PENDING',
            sortBy: 'createdAt',
            sortOrder: 'asc',
            limit: 20,
          },
        })
        .expect(201);

      const response = await fixture.agent.agent
        .get('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: agentFilter.body.id,
            userId: fixture.agent.userId,
          }),
        ]),
      );

      expect(response.body.items).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: requesterFilter.body.id,
          }),
        ]),
      );

      expect(
        response.body.items.every(
          (filter: { organizationId: string; userId: string }) =>
            filter.organizationId === fixture.organization.id &&
            filter.userId === fixture.agent.userId,
        ),
      ).toBe(true);
    });
  });

  describe('Update isolation', () => {
    it('should allow the owner to update their saved filter', async () => {
      const createResponse = await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Original Name',
          description: 'Original description.',
          filters: {
            status: 'OPEN',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: 20,
          },
        })
        .expect(201);

      const savedFilterId = createResponse.body.id;

      const response = await fixture.agent.agent
        .patch(`/api/v1/saved-filters/${savedFilterId}`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Updated Name',
          description: 'Updated description.',
          filters: {
            status: 'PENDING',
            priority: 'HIGH',
            sortBy: 'updatedAt',
            sortOrder: 'asc',
            limit: 50,
          },
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: savedFilterId,
          organizationId: fixture.organization.id,
          userId: fixture.agent.userId,
          name: 'Updated Name',
          description: 'Updated description.',
          filters: expect.objectContaining({
            status: 'PENDING',
            priority: 'HIGH',
            sortBy: 'updatedAt',
            sortOrder: 'asc',
            limit: 50,
          }),
        }),
      );
    });

    it('should not allow a different user in the same organization to update the saved filter', async () => {
      const createResponse = await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Agent Owned Filter',
          filters: {
            status: 'OPEN',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: 20,
          },
        })
        .expect(201);

      const savedFilterId = createResponse.body.id;

      await fixture.requester.agent
        .patch(`/api/v1/saved-filters/${savedFilterId}`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Unauthorized Update',
        })
        .expect(404);

      const response = await fixture.agent.agent
        .get(`/api/v1/saved-filters/${savedFilterId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body.name).toBe('Agent Owned Filter');
    });
  });

  describe('Delete isolation', () => {
    it('should allow the owner to delete their saved filter', async () => {
      const createResponse = await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Filter To Delete',
          filters: {
            status: 'OPEN',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: 20,
          },
        })
        .expect(201);

      const savedFilterId = createResponse.body.id;

      const deleteResponse = await fixture.agent.agent
        .delete(`/api/v1/saved-filters/${savedFilterId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(deleteResponse.body).toEqual({
        success: true,
        savedFilterId,
      });

      await fixture.agent.agent
        .get(`/api/v1/saved-filters/${savedFilterId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(404);
    });

    it('should not allow a different user in the same organization to delete the saved filter', async () => {
      const createResponse = await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Protected Delete Filter',
          filters: {
            status: 'OPEN',
            sortBy: 'updatedAt',
            sortOrder: 'desc',
            limit: 20,
          },
        })
        .expect(201);

      const savedFilterId = createResponse.body.id;

      await fixture.requester.agent
        .delete(`/api/v1/saved-filters/${savedFilterId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(404);

      await fixture.agent.agent
        .get(`/api/v1/saved-filters/${savedFilterId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);
    });
  });
});
