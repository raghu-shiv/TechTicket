import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import {
  cleanupApprovalTestData,
  createPendingApproval,
  createTestTicket,
} from './helpers/approval.helper.js';
import {
  createAuthenticatedTestUser,
  deleteTestUser,
} from './helpers/auth.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

describe('Approval API (e2e)', () => {
  let app: INestApplication;
  let fixture: OrganizationTestFixture;

  beforeAll(async () => {
    app = await createTestApp();
    fixture = await createOrganizationTestFixture(app);
  });

  afterAll(async () => {
    if (fixture) {
      await cleanupApprovalTestData(app, fixture);
    }

    await app.close();
  });

  describe('Authentication and organization boundaries', () => {
    it('should reject unauthenticated approval requests', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tickets/non-existent-ticket/approvals')
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.admin.userId,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Authentication required',
        error: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should reject an authenticated approval request without organization context', async () => {
      const response = await fixture.owner.agent
        .post('/api/v1/tickets/non-existent-ticket/approvals')
        .send({
          approverId: fixture.admin.userId,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Organization context is required',
        error: 'Unauthorized',
        statusCode: 401,
      });
    });

    it('should reject approval access for a non-member organization', async () => {
      const outsiderAuth = await createAuthenticatedTestUser(app);

      try {
        const response = await outsiderAuth.agent
          .get(`/api/v1/approvals/non-existent-approval`)
          .set('x-organization-id', fixture.organization.id)
          .expect(403);

        expect(response.body).toMatchObject({
          message: 'You do not have access to this organization',
          error: 'Forbidden',
          statusCode: 403,
        });
      } finally {
        await deleteTestUser(app, outsiderAuth.user.email);
      }
    });
  });

  describe('Request approval', () => {
    it('should create a pending approval for an organization member', async () => {
      const ticket = await createTestTicket(fixture, fixture.owner);

      const response = await fixture.owner.agent
        .post(`/api/v1/tickets/${ticket.id}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.admin.userId,
          comment: 'Please review this request.',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        ticketId: ticket.id,
        approverId: fixture.admin.userId,
        status: 'PENDING',
        comment: 'Please review this request.',
      });

      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.requestedAt).toEqual(expect.any(String));
    });

    it('should reject an approval request when the approver is not a member of the organization', async () => {
      const ticket = await createTestTicket(fixture, fixture.owner);

      const response = await fixture.owner.agent
        .post(`/api/v1/tickets/${ticket.id}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: `non-member-${randomUUID()}`,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Approver does not belong to this organization',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should reject requesting approval from yourself', async () => {
      const ticket = await createTestTicket(fixture, fixture.owner);

      const response = await fixture.owner.agent
        .post(`/api/v1/tickets/${ticket.id}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.owner.userId,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'You cannot request approval from yourself',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should reject approval requests for a ticket from another organization', async () => {
      const otherFixture = await createOrganizationTestFixture(app);

      try {
        const ticket = await createTestTicket(otherFixture, otherFixture.owner);

        const response = await fixture.owner.agent
          .post(`/api/v1/tickets/${ticket.id}/approvals`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            approverId: fixture.admin.userId,
          })
          .expect(404);

        expect(response.body).toMatchObject({
          message: 'Ticket not found',
          error: 'Not Found',
          statusCode: 404,
        });
      } finally {
        await cleanupApprovalTestData(app, otherFixture);
      }
    });
  });

  describe('Approval queries', () => {
    it('should list approvals for a ticket', async () => {
      const { ticket, approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      const response = await fixture.owner.agent
        .get(`/api/v1/tickets/${ticket.id}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: approval.id,
            ticketId: ticket.id,
            approverId: fixture.admin.userId,
            status: 'PENDING',
          }),
        ]),
      );
    });

    it('should return a single approval', async () => {
      const { approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      const response = await fixture.owner.agent
        .get(`/api/v1/approvals/${approval.id}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toMatchObject({
        id: approval.id,
        ticketId: approval.ticketId,
        approverId: fixture.admin.userId,
        status: 'PENDING',
      });
    });

    it('should reject access to an approval from another organization', async () => {
      const otherFixture = await createOrganizationTestFixture(app);

      try {
        const { approval } = await createPendingApproval(
          otherFixture,
          otherFixture.owner,
          otherFixture.admin,
        );

        const response = await fixture.owner.agent
          .get(`/api/v1/approvals/${approval.id}`)
          .set('x-organization-id', fixture.organization.id)
          .expect(404);

        expect(response.body).toMatchObject({
          message: 'Approval not found',
          error: 'Not Found',
          statusCode: 404,
        });
      } finally {
        await cleanupApprovalTestData(app, otherFixture);
      }
    });
  });

  describe('Approval permissions', () => {
    it('should allow REQUESTER to request approval', async () => {
      const ticket = await createTestTicket(fixture, fixture.requester);

      const response = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticket.id}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.admin.userId,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'PENDING',
        approverId: fixture.admin.userId,
      });
    });

    it('should reject REQUESTER from approving', async () => {
      const { approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      const response = await fixture.requester.agent
        .post(`/api/v1/approvals/${approval.id}/approve`)
        .set('x-organization-id', fixture.organization.id)
        .send({})
        .expect(403);

      expect(response.body).toMatchObject({
        message: 'You do not have permission to perform this action',
        error: 'Forbidden',
        statusCode: 403,
      });
    });
  });

  describe('Approval lifecycle', () => {
    it('should approve a pending approval by the assigned approver', async () => {
      const { approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      const response = await fixture.admin.agent
        .post(`/api/v1/approvals/${approval.id}/approve`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          comment: 'Approved after review.',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: approval.id,
        status: 'APPROVED',
        comment: 'Approved after review.',
      });

      expect(response.body.approvedAt).toEqual(expect.any(String));
    });

    it('should reject a pending approval by the assigned approver', async () => {
      const { approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      const response = await fixture.admin.agent
        .post(`/api/v1/approvals/${approval.id}/reject`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          comment: 'Rejected after review.',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: approval.id,
        status: 'REJECTED',
        comment: 'Rejected after review.',
      });

      expect(response.body.rejectedAt).toEqual(expect.any(String));
    });

    it('should cancel a pending approval by the assigned approver', async () => {
      const { approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      const response = await fixture.admin.agent
        .post(`/api/v1/approvals/${approval.id}/cancel`)
        .set('x-organization-id', fixture.organization.id)
        .expect(201);

      expect(response.body).toMatchObject({
        id: approval.id,
        status: 'CANCELLED',
      });
    });

    it('should reject approval by a user who is not the assigned approver', async () => {
      const { approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      const response = await fixture.agent.agent
        .post(`/api/v1/approvals/${approval.id}/approve`)
        .set('x-organization-id', fixture.organization.id)
        .send({})
        .expect(403);

      expect(response.body).toMatchObject({
        message: 'You are not authorized to approve this request',
        error: 'Forbidden',
        statusCode: 403,
      });
    });

    it('should not allow an already approved approval to be rejected', async () => {
      const { approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      await fixture.admin.agent
        .post(`/api/v1/approvals/${approval.id}/approve`)
        .set('x-organization-id', fixture.organization.id)
        .send({})
        .expect(201);

      const response = await fixture.admin.agent
        .post(`/api/v1/approvals/${approval.id}/reject`)
        .set('x-organization-id', fixture.organization.id)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Approval cannot transition from APPROVED to REJECTED',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should not allow an already rejected approval to be approved', async () => {
      const { approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      await fixture.admin.agent
        .post(`/api/v1/approvals/${approval.id}/reject`)
        .set('x-organization-id', fixture.organization.id)
        .send({})
        .expect(201);

      const response = await fixture.admin.agent
        .post(`/api/v1/approvals/${approval.id}/approve`)
        .set('x-organization-id', fixture.organization.id)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Approval cannot transition from REJECTED to APPROVED',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should not allow an already cancelled approval to be approved', async () => {
      const { approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      await fixture.admin.agent
        .post(`/api/v1/approvals/${approval.id}/cancel`)
        .set('x-organization-id', fixture.organization.id)
        .expect(201);

      const response = await fixture.admin.agent
        .post(`/api/v1/approvals/${approval.id}/approve`)
        .set('x-organization-id', fixture.organization.id)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Approval cannot transition from CANCELLED to APPROVED',
        error: 'Bad Request',
        statusCode: 400,
      });
    });
  });
});
