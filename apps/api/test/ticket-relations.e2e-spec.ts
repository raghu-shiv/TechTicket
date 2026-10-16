import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

type FixtureUser = OrganizationTestFixture['owner'];

async function cleanupFixture(
  database: DatabaseService,
  fixture: OrganizationTestFixture | undefined,
) {
  if (!fixture) return;

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

async function createTicket(
  user: FixtureUser,
  organizationId: string,
  title: string,
): Promise<string> {
  const response = await user.agent
    .post('/api/v1/tickets')
    .set('x-organization-id', organizationId)
    .send({
      title,
      description: `Ticket used by the relations E2E test: ${title}`,
      priority: 'MEDIUM',
      type: 'QUESTION',
    })
    .expect(201);

  return response.body.id as string;
}

describe('Ticket relations API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;

  beforeAll(async () => {
    app = await createTestApp();
    database = app.get(DatabaseService);
    fixture = await createOrganizationTestFixture(app);
  });

  afterAll(async () => {
    await cleanupFixture(database, fixture);
    await app.close();
  });

  it('creates and lists outgoing and incoming ticket relationships', async () => {
    const organizationId = fixture.organization.id;

    const sourceTicketId = await createTicket(
      fixture.agent,
      organizationId,
      'Relations source ticket',
    );

    const targetTicketId = await createTicket(
      fixture.agent,
      organizationId,
      'Relations target ticket',
    );

    const targetTicket = await fixture.agent.agent
      .get(`/api/v1/tickets/${targetTicketId}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const createResponse = await fixture.agent.agent
      .post(`/api/v1/tickets/${sourceTicketId}/relations`)
      .set('x-organization-id', organizationId)
      .send({
        relatedTicketId: targetTicketId,
        type: 'RELATED',
      })
      .expect(201);

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: 'RELATED',
        direction: 'OUTGOING',
        ticket: expect.objectContaining({
          id: targetTicketId,
          ticketNumber: targetTicket.body.ticketNumber,
        }),
      }),
    );

    const outgoing = await fixture.owner.agent
      .get(`/api/v1/tickets/${sourceTicketId}/relations`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(outgoing.body).toEqual([
      expect.objectContaining({
        id: createResponse.body.id,
        type: 'RELATED',
        direction: 'OUTGOING',
        ticket: expect.objectContaining({ id: targetTicketId }),
      }),
    ]);

    const incoming = await fixture.owner.agent
      .get(`/api/v1/tickets/${targetTicketId}/relations`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(incoming.body).toEqual([
      expect.objectContaining({
        id: createResponse.body.id,
        type: 'RELATED',
        direction: 'INCOMING',
        ticket: expect.objectContaining({ id: sourceTicketId }),
      }),
    ]);
  });

  it('rejects a ticket relationship to itself', async () => {
    const organizationId = fixture.organization.id;
    const ticketId = await createTicket(
      fixture.owner,
      organizationId,
      'Self relation should fail',
    );

    await fixture.owner.agent
      .post(`/api/v1/tickets/${ticketId}/relations`)
      .set('x-organization-id', organizationId)
      .send({
        relatedTicketId: ticketId,
        type: 'RELATED',
      })
      .expect(400);
  });

  it('rejects duplicate ticket relationships', async () => {
    const organizationId = fixture.organization.id;
    const sourceTicketId = await createTicket(
      fixture.owner,
      organizationId,
      'Duplicate relation source',
    );
    const targetTicketId = await createTicket(
      fixture.owner,
      organizationId,
      'Duplicate relation target',
    );

    const path = `/api/v1/tickets/${sourceTicketId}/relations`;

    await fixture.owner.agent
      .post(path)
      .set('x-organization-id', organizationId)
      .send({
        relatedTicketId: targetTicketId,
        type: 'RELATED',
      })
      .expect(201);

    await fixture.owner.agent
      .post(path)
      .set('x-organization-id', organizationId)
      .send({
        relatedTicketId: targetTicketId,
        type: 'RELATED',
      })
      .expect(409);
  });

  it('rejects relationships to tickets in another organization', async () => {
    const otherFixture = await createOrganizationTestFixture(app);

    try {
      const sourceTicketId = await createTicket(
        fixture.owner,
        fixture.organization.id,
        'Cross organization relation source',
      );

      const foreignTicketId = await createTicket(
        otherFixture.owner,
        otherFixture.organization.id,
        'Cross organization relation target',
      );

      await fixture.owner.agent
        .post(`/api/v1/tickets/${sourceTicketId}/relations`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          relatedTicketId: foreignTicketId,
          type: 'RELATED',
        })
        .expect(403);
    } finally {
      await cleanupFixture(database, otherFixture);
    }
  });

  it('restricts relationship creation to staff roles', async () => {
    const organizationId = fixture.organization.id;
    const sourceTicketId = await createTicket(
      fixture.requester,
      organizationId,
      'Requester relation source',
    );
    const targetTicketId = await createTicket(
      fixture.requester,
      organizationId,
      'Requester relation target',
    );

    await fixture.requester.agent
      .post(`/api/v1/tickets/${sourceTicketId}/relations`)
      .set('x-organization-id', organizationId)
      .send({
        relatedTicketId: targetTicketId,
        type: 'RELATED',
      })
      .expect(403);
  });

  it('restricts relationship deletion to staff roles', async () => {
    const organizationId = fixture.organization.id;
    const sourceTicketId = await createTicket(
      fixture.owner,
      organizationId,
      'Protected relation source',
    );
    const targetTicketId = await createTicket(
      fixture.owner,
      organizationId,
      'Protected relation target',
    );

    const created = await fixture.agent.agent
      .post(`/api/v1/tickets/${sourceTicketId}/relations`)
      .set('x-organization-id', organizationId)
      .send({
        relatedTicketId: targetTicketId,
        type: 'RELATED',
      })
      .expect(201);

    await fixture.requester.agent
      .delete(`/api/v1/tickets/${sourceTicketId}/relations/${created.body.id}`)
      .set('x-organization-id', organizationId)
      .expect(403);
  });

  it('allows staff to remove an outgoing relationship', async () => {
    const organizationId = fixture.organization.id;
    const sourceTicketId = await createTicket(
      fixture.agent,
      organizationId,
      'Removable relation source',
    );
    const targetTicketId = await createTicket(
      fixture.agent,
      organizationId,
      'Removable relation target',
    );

    const created = await fixture.agent.agent
      .post(`/api/v1/tickets/${sourceTicketId}/relations`)
      .set('x-organization-id', organizationId)
      .send({
        relatedTicketId: targetTicketId,
        type: 'BLOCKS',
      })
      .expect(201);

    await fixture.agent.agent
      .delete(`/api/v1/tickets/${sourceTicketId}/relations/${created.body.id}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const relations = await fixture.agent.agent
      .get(`/api/v1/tickets/${sourceTicketId}/relations`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(relations.body).toEqual([]);
  });
});
