import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';

import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

describe('Organization Context + RBAC API (e2e)', () => {
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

  describe('Organization context', () => {
    it('should reject unauthenticated organization-context requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/organizations/context')
        .set('x-organization-id', fixture.organization.id)
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Authentication required',
        error: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should reject an authenticated request when organization context is missing', async () => {
      const response = await fixture.owner.agent
        .get('/api/v1/organizations/context')
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Organization context is required',
        error: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should reject an authenticated user who is not a member of the organization', async () => {
      const response = await fixture.owner.agent
        .get('/api/v1/organizations/context')
        .set('x-organization-id', 'cm00000000000000000000000')
        .expect(403);

      expect(response.body).toMatchObject({
        message: 'You do not have access to this organization',
        error: 'Forbidden',
        statusCode: 403,
      });
    });

    it('should resolve a valid organization context', async () => {
      const response = await fixture.owner.agent
        .get('/api/v1/organizations/context')
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toEqual({
        organizationId: fixture.organization.id,
        userId: fixture.owner.userId,
        role: 'OWNER',
      });
    });

    it('should resolve organization context for an ADMIN member', async () => {
      const response = await fixture.admin.agent
        .get('/api/v1/organizations/context')
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toEqual({
        organizationId: fixture.organization.id,
        userId: fixture.admin.userId,
        role: 'ADMIN',
      });
    });

    it('should resolve organization context for an AGENT member', async () => {
      const response = await fixture.agent.agent
        .get('/api/v1/organizations/context')
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toEqual({
        organizationId: fixture.organization.id,
        userId: fixture.agent.userId,
        role: 'AGENT',
      });
    });

    it('should resolve organization context for a REQUESTER member', async () => {
      const response = await fixture.requester.agent
        .get('/api/v1/organizations/context')
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toEqual({
        organizationId: fixture.organization.id,
        userId: fixture.requester.userId,
        role: 'REQUESTER',
      });
    });
  });

  describe('Organization role authorization', () => {
    it('should allow OWNER to access an OWNER/ADMIN protected endpoint', async () => {
      const response = await fixture.owner.agent
        .get('/api/v1/organizations/admin-test')
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Organization admin authorization successful',
        organizationId: fixture.organization.id,
        userId: fixture.owner.userId,
        role: 'OWNER',
      });
    });

    it('should allow ADMIN to access an OWNER/ADMIN protected endpoint', async () => {
      const response = await fixture.admin.agent
        .get('/api/v1/organizations/admin-test')
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Organization admin authorization successful',
        organizationId: fixture.organization.id,
        userId: fixture.admin.userId,
        role: 'ADMIN',
      });
    });

    it('should reject AGENT from an OWNER/ADMIN protected endpoint', async () => {
      const response = await fixture.agent.agent
        .get('/api/v1/organizations/admin-test')
        .set('x-organization-id', fixture.organization.id)
        .expect(403);

      expect(response.body).toMatchObject({
        message: 'You do not have permission to perform this action',
        error: 'Forbidden',
        statusCode: 403,
      });
    });

    it('should reject REQUESTER from an OWNER/ADMIN protected endpoint', async () => {
      const response = await fixture.requester.agent
        .get('/api/v1/organizations/admin-test')
        .set('x-organization-id', fixture.organization.id)
        .expect(403);

      expect(response.body).toMatchObject({
        message: 'You do not have permission to perform this action',
        error: 'Forbidden',
        statusCode: 403,
      });
    });
  });

  describe('Ticket organization boundary', () => {
    it('should reject an authenticated ticket request without organization context', async () => {
      const response = await fixture.owner.agent
        .get('/api/v1/tickets')
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Organization context is required',
        error: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should allow a valid organization context to reach the ticket endpoint', async () => {
      const response = await fixture.owner.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id);

      expect(response.status).not.toBe(401);

      expect(response.body).toBeDefined();
    });
  });
});
