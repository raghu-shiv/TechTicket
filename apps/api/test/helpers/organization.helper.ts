import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { DatabaseService } from '../../src/database/database.service';
import type { OrganizationRole } from '../../src/common/organization/organization.types';

import { createAuthenticatedTestUser } from './auth.helper.js';

type AuthenticatedTestUser = Awaited<
  ReturnType<typeof createAuthenticatedTestUser>
>;

interface OrganizationFixture {
  id: string;
  name: string;
  slug: string;
}

interface OrganizationTestUser {
  userId: string;
  email: string;
  role: OrganizationRole;
  agent: AuthenticatedTestUser['agent'];
}

export interface OrganizationTestFixture {
  organization: OrganizationFixture;
  owner: OrganizationTestUser;
  admin: OrganizationTestUser;
  agent: OrganizationTestUser;
  requester: OrganizationTestUser;
}

export async function createOrganizationTestFixture(
  app: INestApplication,
): Promise<OrganizationTestFixture> {
  const database = app.get(DatabaseService);

  const ownerAuth = await createAuthenticatedTestUser(app);

  const organizationResponse = await ownerAuth.agent
    .post('/api/v1/organizations')
    .send({
      name: `E2E Test Organization ${randomUUID()}`,
      slug: `e2e-test-org-${randomUUID()}`,
      description: 'Organization created for API authorization tests',
    })
    .expect(201);

  const organization = organizationResponse.body as {
    id: string;
    name: string;
    slug: string;
  };

  const ownerRecord = await database.user.findUniqueOrThrow({
    where: {
      email: ownerAuth.user.email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  const adminAuth = await createAuthenticatedTestUser(app);
  const agentAuth = await createAuthenticatedTestUser(app);
  const requesterAuth = await createAuthenticatedTestUser(app);

  const adminRecord = await database.user.findUniqueOrThrow({
    where: {
      email: adminAuth.user.email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  const agentRecord = await database.user.findUniqueOrThrow({
    where: {
      email: agentAuth.user.email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  const requesterRecord = await database.user.findUniqueOrThrow({
    where: {
      email: requesterAuth.user.email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  await database.membership.createMany({
    data: [
      {
        userId: adminRecord.id,
        organizationId: organization.id,
        role: 'ADMIN',
      },
      {
        userId: agentRecord.id,
        organizationId: organization.id,
        role: 'AGENT',
      },
      {
        userId: requesterRecord.id,
        organizationId: organization.id,
        role: 'REQUESTER',
      },
    ],
  });

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },

    owner: {
      userId: ownerRecord.id,
      email: ownerRecord.email,
      role: 'OWNER',
      agent: ownerAuth.agent,
    },

    admin: {
      userId: adminRecord.id,
      email: adminRecord.email,
      role: 'ADMIN',
      agent: adminAuth.agent,
    },

    agent: {
      userId: agentRecord.id,
      email: agentRecord.email,
      role: 'AGENT',
      agent: agentAuth.agent,
    },

    requester: {
      userId: requesterRecord.id,
      email: requesterRecord.email,
      role: 'REQUESTER',
      agent: requesterAuth.agent,
    },
  };
}
