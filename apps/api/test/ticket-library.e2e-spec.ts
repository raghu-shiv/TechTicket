import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import {
  createTestTicket,
  cleanupApprovalTestData,
} from './helpers/approval.helper.js';
import {
  createAuthenticatedTestUser,
  deleteTestUser,
} from './helpers/auth.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

describe('Ticket Library API (e2e)', () => {
  let app: INestApplication;
  let organizationA: OrganizationTestFixture;
  let organizationB: OrganizationTestFixture;

  beforeAll(async () => {
    app = await createTestApp();
    organizationA = await createOrganizationTestFixture(app);
    organizationB = await createOrganizationTestFixture(app);
  });

  afterAll(async () => {
    if (organizationA) await cleanupApprovalTestData(app, organizationA);
    if (organizationB) await cleanupApprovalTestData(app, organizationB);
    await app.close();
  });

  function articlePayload(overrides: Record<string, unknown> = {}) {
    return {
      title: 'Reset the desktop client cache',
      problem:
        'The desktop client shows stale account information after an account switch.',
      resolution:
        'Sign out, clear the local client cache, restart the client, and sign in again.',
      tags: ['desktop', 'cache'],
      ...overrides,
    };
  }

  it('creates and lists a knowledge article in the active organization', async () => {
    const createResponse = await organizationA.agent.agent
      .post('/api/v1/ticket-library')
      .set('x-organization-id', organizationA.organization.id)
      .send(articlePayload())
      .expect(201);

    expect(createResponse.body).toMatchObject({
      organizationId: organizationA.organization.id,
      createdById: organizationA.agent.userId,
      title: 'Reset the desktop client cache',
      tags: ['desktop', 'cache'],
    });

    const listResponse = await organizationA.requester.agent
      .get('/api/v1/ticket-library?search=desktop')
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: createResponse.body.id }),
      ]),
    );
  });

  it('does not expose another organization’s knowledge articles', async () => {
    const foreignCreate = await organizationB.agent.agent
      .post('/api/v1/ticket-library')
      .set('x-organization-id', organizationB.organization.id)
      .send(articlePayload({ title: 'Private article from organization B' }))
      .expect(201);

    const response = await organizationA.requester.agent
      .get('/api/v1/ticket-library')
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    expect(
      response.body.data.every(
        (entry: { organizationId: string }) =>
          entry.organizationId === organizationA.organization.id,
      ),
    ).toBe(true);
    expect(response.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: foreignCreate.body.id }),
      ]),
    );

    await organizationA.agent.agent
      .get(`/api/v1/ticket-library/${foreignCreate.body.id}`)
      .set('x-organization-id', organizationA.organization.id)
      .expect(404);

    await organizationA.agent.agent
      .patch(`/api/v1/ticket-library/${foreignCreate.body.id}`)
      .set('x-organization-id', organizationA.organization.id)
      .send({ title: 'Unauthorized update attempt' })
      .expect(404);

    await organizationA.owner.agent
      .delete(`/api/v1/ticket-library/${foreignCreate.body.id}`)
      .set('x-organization-id', organizationA.organization.id)
      .expect(404);
  });

  it('rejects article creation by a requester', async () => {
    await organizationA.requester.agent
      .post('/api/v1/ticket-library')
      .set('x-organization-id', organizationA.organization.id)
      .send(articlePayload({ title: 'Requester attempt' }))
      .expect(403);
  });

  it('allows linking only to a resolved/closed ticket from the active organization', async () => {
    const sourceTicket = await createTestTicket(
      organizationA,
      organizationA.owner,
    );

    await organizationA.owner.agent
      .patch(`/api/v1/tickets/${sourceTicket.id}/status`)
      .set('x-organization-id', organizationA.organization.id)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    await organizationA.owner.agent
      .patch(`/api/v1/tickets/${sourceTicket.id}/status`)
      .set('x-organization-id', organizationA.organization.id)
      .send({ status: 'RESOLVED' })
      .expect(200);

    const created = await organizationA.agent.agent
      .post('/api/v1/ticket-library')
      .set('x-organization-id', organizationA.organization.id)
      .send(articlePayload({ sourceTicketId: sourceTicket.id }))
      .expect(201);

    expect(created.body.sourceTicketId).toBe(sourceTicket.id);

    const foreignTicket = await createTestTicket(
      organizationB,
      organizationB.owner,
    );
    await organizationA.agent.agent
      .post('/api/v1/ticket-library')
      .set('x-organization-id', organizationA.organization.id)
      .send(
        articlePayload({
          title: 'Foreign source',
          sourceTicketId: foreignTicket.id,
        }),
      )
      .expect(404);
  });

  it('rejects invalid article data', async () => {
    await organizationA.agent.agent
      .post('/api/v1/ticket-library')
      .set('x-organization-id', organizationA.organization.id)
      .send(articlePayload({ title: '   ' }))
      .expect(400);
  });

  it('requires authentication and an organization membership', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/ticket-library')
      .set('x-organization-id', organizationA.organization.id)
      .expect(401);

    const outsider = await createAuthenticatedTestUser(app);
    try {
      await outsider.agent
        .get('/api/v1/ticket-library')
        .set('x-organization-id', organizationA.organization.id)
        .expect(403);
    } finally {
      await deleteTestUser(app, outsider.user.email);
    }
  });
});
