import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { DatabaseService } from '../../src/database/database.service.js';

import type { OrganizationTestFixture } from './organization.helper.js';

export async function createTestTicket(
  fixture: OrganizationTestFixture,
  user: OrganizationTestFixture['owner'],
) {
  const response = await user.agent
    .post('/api/v1/tickets')
    .set('x-organization-id', fixture.organization.id)
    .send({
      title: `Approval Test Ticket ${randomUUID()}`,
      description: 'Ticket created for approval API tests',
      priority: 'MEDIUM',
      type: 'SERVICE_REQUEST',
    })
    .expect(201);

  return response.body;
}

export async function createPendingApproval(
  fixture: OrganizationTestFixture,
  requester: OrganizationTestFixture['owner'],
  approver: OrganizationTestFixture['admin'],
) {
  const ticket = await createTestTicket(fixture, requester);

  const response = await requester.agent
    .post(`/api/v1/tickets/${ticket.id}/approvals`)
    .set('x-organization-id', fixture.organization.id)
    .send({
      approverId: approver.userId,
      comment: 'Please review this request.',
    })
    .expect(201);

  return {
    ticket,
    approval: response.body,
  };
}

export async function cleanupApprovalTestData(
  app: INestApplication,
  fixture: OrganizationTestFixture,
): Promise<void> {
  const database = app.get(DatabaseService);

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
