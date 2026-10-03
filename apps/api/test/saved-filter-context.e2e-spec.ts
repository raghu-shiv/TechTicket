import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

describe('SavedFilter guards and context (e2e)', () => {
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

  describe('Authentication', () => {
    it('should reject unauthenticated saved-filter requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Authentication required',
        error: 'Unauthorized',
        statusCode: 401,
      });
    });
  });

  describe('Organization context', () => {
    it('should reject an authenticated request without organization context', async () => {
      const response = await fixture.agent.agent
        .get('/api/v1/saved-filters')
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Organization context is required',
        error: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should reject an authenticated user who is not a member of the requested organization', async () => {
      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        const response = await fixture.agent.agent
          .get('/api/v1/saved-filters')
          .set('x-organization-id', foreignFixture.organization.id)
          .expect(403);

        expect(response.body).toMatchObject({
          message: 'You do not have access to this organization',
          error: 'Forbidden',
          statusCode: 403,
        });
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
  });

  describe('Ownership context', () => {
    it('should derive userId from the authenticated session and organizationId from organization context', async () => {
      const response = await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Agent saved filter',
          description: 'Created through authenticated context.',
          filters: {
            status: 'OPEN',
            priority: 'HIGH',
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
          name: 'Agent saved filter',
        }),
      );
    });

    it('should not allow client-supplied ownership fields to override authenticated context', async () => {
      const response = await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Ownership isolation filter',
          organizationId: 'cm00000000000000000000000',
          userId: 'cm00000000000000000000000',
          filters: {
            status: 'OPEN',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: 20,
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should use the authenticated user when listing saved filters', async () => {
      await fixture.agent.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Agent private filter',
          filters: {
            status: 'OPEN',
            sortBy: 'updatedAt',
            sortOrder: 'desc',
            limit: 20,
          },
        })
        .expect(201);

      await fixture.requester.agent
        .post('/api/v1/saved-filters')
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Requester private filter',
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
            name: 'Agent private filter',
            organizationId: fixture.organization.id,
            userId: fixture.agent.userId,
          }),
        ]),
      );

      expect(response.body.items).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Requester private filter',
            userId: fixture.requester.userId,
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
});
