import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import { createOrganizationTestFixture } from './helpers/organization.helper.js';

describe('Ticket creation API (e2e)', () => {
  let app: INestApplication;

  let organizationA: Awaited<ReturnType<typeof createOrganizationTestFixture>>;

  let organizationB: Awaited<ReturnType<typeof createOrganizationTestFixture>>;

  beforeAll(async () => {
    app = await createTestApp();

    organizationA = await createOrganizationTestFixture(app);
    organizationB = await createOrganizationTestFixture(app);
  });

  afterAll(async () => {
    await app.close();
  });

  function validTicketPayload() {
    return {
      title: 'Unable to access the application',
      description:
        'The application returns an error when I sign in. Please investigate.',
      type: 'INCIDENT',
      priority: 'HIGH',
    };
  }

  it('creates a ticket for a requester in the authenticated organization', async () => {
    const response = await organizationA.requester.agent
      .post('/api/v1/tickets')
      .set('x-organization-id', organizationA.organization.id)
      .send(validTicketPayload())
      .expect(201);

    expect(response.body).toMatchObject({
      organizationId: organizationA.organization.id,
      requesterId: organizationA.requester.userId,
      title: 'Unable to access the application',
      description:
        'The application returns an error when I sign in. Please investigate.',
      status: 'OPEN',
      priority: 'HIGH',
      type: 'INCIDENT',
      productId: null,
    });

    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.ticketNumber).toEqual(expect.any(String));
  });

  it('sets the agent as requester when the agent creates the ticket', async () => {
    const response = await organizationA.agent.agent
      .post('/api/v1/tickets')
      .set('x-organization-id', organizationA.organization.id)
      .send({
        ...validTicketPayload(),
        title: 'Agent-raised operational issue',
        type: 'PROBLEM',
        priority: 'MEDIUM',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      organizationId: organizationA.organization.id,
      requesterId: organizationA.agent.userId,
      title: 'Agent-raised operational issue',
      type: 'PROBLEM',
      priority: 'MEDIUM',
    });
  });

  it('rejects a ticket with an empty required title', async () => {
    await organizationA.requester.agent
      .post('/api/v1/tickets')
      .set('x-organization-id', organizationA.organization.id)
      .send({
        ...validTicketPayload(),
        title: '',
      })
      .expect(400);
  });

  it('rejects unauthenticated ticket creation', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('x-organization-id', organizationA.organization.id)
      .send(validTicketPayload())
      .expect(401);
  });

  it('rejects creation under an organization the user does not belong to', async () => {
    await organizationA.requester.agent
      .post('/api/v1/tickets')
      .set('x-organization-id', organizationB.organization.id)
      .send(validTicketPayload())
      .expect(403);
  });

  it('does not allow the body to override organization context', async () => {
    await organizationA.requester.agent
      .post('/api/v1/tickets')
      .set('x-organization-id', organizationA.organization.id)
      .send({
        ...validTicketPayload(),
        organizationId: organizationB.organization.id,
      })
      .expect(400);
  });
});
