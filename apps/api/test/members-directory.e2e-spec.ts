import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import { cleanupApprovalTestData } from './helpers/approval.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

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

    expect(
      response.body.every(
        (member: { organizationId: string }) =>
          member.organizationId === organizationA.organization.id,
      ),
    ).toBe(true);
    expect(
      response.body.some(
        (member: { userId: string }) =>
          member.userId === organizationB.admin.userId,
      ),
    ).toBe(false);
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

  it('allows OWNER and ADMIN to search members by name and email', async () => {
    // Read a name from the existing, authorized directory so the test
    // uses real fixture data rather than assuming a particular test name.
    const directoryResponse = await organizationA.owner.agent
      .get('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    const ownerMember = directoryResponse.body.find(
      (member: { userId: string; user: { name: string; email: string } }) =>
        member.userId === organizationA.owner.userId,
    );

    expect(ownerMember).toBeDefined();

    const nameQuery = ownerMember.user.name.slice(0, 3).toUpperCase();

    const nameResponse = await organizationA.owner.agent
      .get('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .query({ search: nameQuery, limit: 8 })
      .expect(200);

    expect(
      nameResponse.body.some(
        (member: { id: string }) => member.id === organizationA.owner.userId,
      ),
    ).toBe(true);

    const emailResponse = await organizationA.admin.agent
      .get('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .query({ search: organizationA.owner.email, limit: 8 })
      .expect(200);

    expect(emailResponse.body).toContainEqual({
      id: organizationA.owner.userId,
      displayName: ownerMember.user.name.trim() || ownerMember.user.email,
      email: ownerMember.user.email,
    });
  });

  it('returns only the approved search fields and respects the requested limit', async () => {
    const response = await organizationA.owner.agent
      .get('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .query({
        search: organizationA.owner.email,
        limit: 1,
      })
      .expect(200);

    expect(response.body).toHaveLength(1);

    for (const member of response.body) {
      expect(Object.keys(member).sort()).toEqual([
        'displayName',
        'email',
        'id',
      ]);
    }
  });

  it('does not return members belonging only to another organization', async () => {
    const response = await organizationA.owner.agent
      .get('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .query({
        search: organizationB.admin.email,
        limit: 8,
      })
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('rejects user searches by AGENT and REQUESTER roles', async () => {
    await organizationA.agent.agent
      .get('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .query({ search: 'example', limit: 8 })
      .expect(403);

    await organizationA.requester.agent
      .get('/api/v1/members')
      .set('x-organization-id', organizationA.organization.id)
      .query({ search: 'example', limit: 8 })
      .expect(403);
  });

  it('rejects invalid search queries and result limits', async () => {
    const baseUrl = '/api/v1/members';
    const request = organizationA.owner.agent;

    await request
      .get(baseUrl)
      .set('x-organization-id', organizationA.organization.id)
      .query({ search: 'a' })
      .expect(400);

    await request
      .get(baseUrl)
      .set('x-organization-id', organizationA.organization.id)
      .query({ search: 'x'.repeat(101) })
      .expect(400);

    await request
      .get(baseUrl)
      .set('x-organization-id', organizationA.organization.id)
      .query({ search: '   ' })
      .expect(400);

    await request
      .get(baseUrl)
      .set('x-organization-id', organizationA.organization.id)
      .query({ search: 'example', limit: 9 })
      .expect(400);

    await request
      .get(baseUrl)
      .set('x-organization-id', organizationA.organization.id)
      .query({ search: 'example', limit: 'invalid' })
      .expect(400);
  });
});
