import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import { cleanupApprovalTestData, createPendingApproval } from './helpers/approval.helper.js';
import { createAuthenticatedTestUser, deleteTestUser } from './helpers/auth.helper.js';
import { DatabaseService } from '../src/database/database.service.js';
import { createOrganizationTestFixture, type OrganizationTestFixture } from './helpers/organization.helper.js';


describe('Approval inbox API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let organizationA: OrganizationTestFixture;
  let organizationB: OrganizationTestFixture;

  beforeAll(async () => {
    app = await createTestApp();
    database = app.get(DatabaseService);
    organizationA = await createOrganizationTestFixture(app);
    organizationB = await createOrganizationTestFixture(app);
  });

  afterAll(async () => {
    if (organizationA) await cleanupApprovalTestData(app, organizationA);
    if (organizationB) await cleanupApprovalTestData(app, organizationB);
    await app.close();
  });

  it('returns pending approvals assigned to the authenticated user with ticket and requester context', async () => {
    const { ticket, approval } = await createPendingApproval(
      organizationA,
      organizationA.owner,
      organizationA.admin,
    );

    const response = await organizationA.admin.agent
      .get('/api/v1/approvals?status=PENDING')
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: approval.id,
          approverId: organizationA.admin.userId,
          status: 'PENDING',
          ticket: expect.objectContaining({
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            requester: expect.objectContaining({ id: organizationA.owner.userId }),
          }),
        }),
      ]),
    );
  });

  it('returns only approvals assigned to the current user', async () => {
    await createPendingApproval(
      organizationA,
      organizationA.owner,
      organizationA.admin,
    );

    const response = await organizationA.agent.agent
      .get('/api/v1/approvals?status=PENDING')
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('does not expose approvals from another organization even for a multi-organization user', async () => {
    // The same approver belongs to both organizations, so this tests the
    // explicit ticket.organizationId predicate rather than only user filtering.
    await database.membership.create({
      data: {
        userId: organizationA.admin.userId,
        organizationId: organizationB.organization.id,
        role: 'ADMIN',
      },
    });

    const sharedApprover = {
      ...organizationB.admin,
      userId: organizationA.admin.userId,
    };
    const { approval } = await createPendingApproval(
      organizationB,
      organizationB.owner,
      sharedApprover,
    );

    const response = await organizationA.admin.agent
      .get('/api/v1/approvals?status=PENDING')
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    expect(response.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: approval.id })]),
    );
  });

  it('rejects invalid status filters', async () => {
    await organizationA.admin.agent
      .get('/api/v1/approvals?status=WAITING')
      .set('x-organization-id', organizationA.organization.id)
      .expect(400);
  });

  it('requires authentication, organization context, and organization membership', async () => {
    const unauthenticated = await import('supertest');
    await unauthenticated.default(app.getHttpServer())
      .get('/api/v1/approvals')
      .set('x-organization-id', organizationA.organization.id)
      .expect(401);

    await organizationA.owner.agent
      .get('/api/v1/approvals')
      .expect(401);

    const outsider = await createAuthenticatedTestUser(app);
    try {
      await outsider.agent
        .get('/api/v1/approvals')
        .set('x-organization-id', organizationA.organization.id)
        .expect(403);
    } finally {
      await deleteTestUser(app, outsider.user.email);
    }
  });
});
