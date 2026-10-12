import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import { cleanupApprovalTestData } from './helpers/approval.helper.js';
import { createOrganizationTestFixture, type OrganizationTestFixture } from './helpers/organization.helper.js';

describe('Organization member directory authorization (e2e)', () => {
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

  it('allows OWNER/ADMIN to list members scoped to their active organization', async () => {
    const response = await organizationA.owner.agent
      .get('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    expect(response.body.every((member: { organizationId: string }) => member.organizationId === organizationA.organization.id)).toBe(true);
    expect(response.body.some((member: { userId: string }) => member.userId === organizationB.admin.userId)).toBe(false);
  });

  it('rejects AGENT/REQUESTER access to the members directory', async () => {
    await organizationA.agent.agent
      .get('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .expect(403);

    await organizationA.requester.agent
      .get('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .expect(403);
  });


  it('rejects membership mutations from AGENT and REQUESTER roles', async () => {
    await organizationA.agent.agent
      .post('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .send({ email: organizationA.requester.email, role: 'REQUESTER' })
      .expect(403);

    await organizationA.requester.agent
      .delete(`/api/v1/members/${organizationA.agent.userId}`)
      .set('x-organization-id', organizationA.organization.id)
      .expect(403);
  });

  it('does not allow a member mutation against a user who is not a member of the active organization', async () => {
    await organizationA.owner.agent
      .patch(`/api/v1/members/${organizationB.admin.userId}`)
      .set('x-organization-id', organizationA.organization.id)
      .send({ role: 'AGENT' })
      .expect(404);
  });
});
