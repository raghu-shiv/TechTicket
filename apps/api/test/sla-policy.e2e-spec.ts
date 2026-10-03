import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import { createOrganizationTestFixture } from './helpers/organization.helper.js';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface SlaTargetInput {
  priority: Priority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

interface SlaPolicyResponse {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  targets: Array<{
    id: string;
    priority: Priority;
    firstResponseMinutes: number;
    resolutionMinutes: number;
  }>;
}

const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function buildTargets(
  overrides: Partial<Record<Priority, Partial<SlaTargetInput>>> = {},
): SlaTargetInput[] {
  const defaults: Record<Priority, SlaTargetInput> = {
    LOW: {
      priority: 'LOW',
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
    },
    MEDIUM: {
      priority: 'MEDIUM',
      firstResponseMinutes: 30,
      resolutionMinutes: 240,
    },
    HIGH: {
      priority: 'HIGH',
      firstResponseMinutes: 15,
      resolutionMinutes: 120,
    },
    URGENT: {
      priority: 'URGENT',
      firstResponseMinutes: 5,
      resolutionMinutes: 60,
    },
  };

  return priorities.map((priority) => ({
    ...defaults[priority],
    ...overrides[priority],
    priority,
  }));
}

function buildPolicyPayload(
  name = `SLA Policy ${randomUUID()}`,
  overrides: Partial<Record<Priority, Partial<SlaTargetInput>>> = {},
) {
  return {
    name,
    targets: buildTargets(overrides),
  };
}

describe('SLA Policy API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: Awaited<ReturnType<typeof createOrganizationTestFixture>>;

  beforeAll(async () => {
    app = await createTestApp();
    database = app.get(DatabaseService);
    fixture = await createOrganizationTestFixture(app);
  });

  afterEach(async () => {
    await database.slaPolicy.deleteMany({
      where: {
        organizationId: fixture.organization.id,
      },
    });
  });

  afterAll(async () => {
    await database.slaPolicy.deleteMany({
      where: {
        organizationId: fixture.organization.id,
      },
    });

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

    await app.close();
  });

  function owner() {
    return fixture.owner.agent;
  }

  function admin() {
    return fixture.admin.agent;
  }

  function agent() {
    return fixture.agent.agent;
  }

  function requester() {
    return fixture.requester.agent;
  }

  function organizationHeaders<T>(request: T): T {
    return (
      request as T & {
        set: (field: string, value: string) => T;
      }
    ).set('x-organization-id', fixture.organization.id);
  }

  async function createPolicy(
    name = `SLA Policy ${randomUUID()}`,
    overrides: Partial<Record<Priority, Partial<SlaTargetInput>>> = {},
  ) {
    return organizationHeaders(owner().post('/api/v1/sla-policies'))
      .send(buildPolicyPayload(name, overrides))
      .expect(201);
  }

  async function deactivatePolicy(policyId: string) {
    return organizationHeaders(
      owner().post(`/api/v1/sla-policies/${policyId}/deactivate`),
    ).expect(201);
  }

  async function activatePolicy(policyId: string) {
    return organizationHeaders(
      owner().post(`/api/v1/sla-policies/${policyId}/activate`),
    ).expect(201);
  }

  describe('GET /api/v1/sla-policies', () => {
    it('should return an empty list when the organization has no SLA policies', async () => {
      const response = await organizationHeaders(
        owner().get('/api/v1/sla-policies'),
      ).expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return policies belonging to the current organization', async () => {
      const policy = await createPolicy();

      const response = await organizationHeaders(
        owner().get('/api/v1/sla-policies'),
      ).expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(policy.body.id);
      expect(response.body[0].name).toBe(policy.body.name);
    });

    it('should return the complete SLA policy shape', async () => {
      await createPolicy('Complete SLA Policy');

      const response = await organizationHeaders(
        owner().get('/api/v1/sla-policies'),
      ).expect(200);

      const policy = response.body[0] as SlaPolicyResponse;

      expect(policy).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Complete SLA Policy',
          isActive: expect.any(Boolean),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          targets: expect.any(Array),
        }),
      );

      expect(policy.targets).toHaveLength(4);

      expect(policy.targets.map((target) => target.priority).sort()).toEqual(
        [...priorities].sort(),
      );

      for (const target of policy.targets) {
        expect(target).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            priority: expect.any(String),
            firstResponseMinutes: expect.any(Number),
            resolutionMinutes: expect.any(Number),
          }),
        );
      }
    });
  });

  describe('GET /api/v1/sla-policies/:policyId', () => {
    it('should return a policy belonging to the current organization', async () => {
      const created = await createPolicy('Detail SLA Policy');

      const response = await organizationHeaders(
        owner().get(`/api/v1/sla-policies/${created.body.id}`),
      ).expect(200);

      expect(response.body.id).toBe(created.body.id);
      expect(response.body.name).toBe('Detail SLA Policy');
      expect(response.body.targets).toHaveLength(4);
    });

    it('should return 404 when the policy does not exist', async () => {
      await organizationHeaders(
        owner().get(`/api/v1/sla-policies/${randomUUID()}`),
      ).expect(404);
    });
  });

  describe('POST /api/v1/sla-policies', () => {
    it('should create a policy with four priority targets', async () => {
      const response = await createPolicy('Create SLA Policy');

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Create SLA Policy',
          isActive: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          targets: expect.any(Array),
        }),
      );

      expect(response.body.targets).toHaveLength(4);

      expect(
        response.body.targets
          .map(
            (target: SlaPolicyResponse['targets'][number]) => target.priority,
          )
          .sort(),
      ).toEqual([...priorities].sort());
    });

    it('should create new policies as inactive', async () => {
      const response = await createPolicy('Inactive By Default');

      expect(response.body.isActive).toBe(false);
    });

    it('should reject duplicate policy names within the organization', async () => {
      await createPolicy('Duplicate SLA Policy');

      await organizationHeaders(owner().post('/api/v1/sla-policies'))
        .send(buildPolicyPayload('Duplicate SLA Policy'))
        .expect(409);
    });

    it('should reject fewer than four targets', async () => {
      const payload = buildPolicyPayload('Too Few Targets');

      payload.targets = payload.targets.slice(0, 3);

      await organizationHeaders(owner().post('/api/v1/sla-policies'))
        .send(payload)
        .expect(400);
    });

    it('should reject duplicate priorities', async () => {
      const payload = buildPolicyPayload('Duplicate Priorities');

      payload.targets[1].priority = 'LOW';

      await organizationHeaders(owner().post('/api/v1/sla-policies'))
        .send(payload)
        .expect(400);
    });

    it('should reject missing required priorities', async () => {
      const payload = buildPolicyPayload('Missing Priority');

      payload.targets[1].priority = 'LOW';
      payload.targets[2].priority = 'HIGH';
      payload.targets[3].priority = 'URGENT';

      await organizationHeaders(owner().post('/api/v1/sla-policies'))
        .send(payload)
        .expect(400);
    });

    it('should reject non-positive duration values', async () => {
      const payload = buildPolicyPayload('Invalid Duration', {
        LOW: {
          firstResponseMinutes: 0,
        },
      });

      await organizationHeaders(owner().post('/api/v1/sla-policies'))
        .send(payload)
        .expect(400);
    });

    it('should reject first-response duration greater than resolution duration', async () => {
      const payload = buildPolicyPayload('Invalid SLA Ordering', {
        HIGH: {
          firstResponseMinutes: 180,
          resolutionMinutes: 120,
        },
      });

      await organizationHeaders(owner().post('/api/v1/sla-policies'))
        .send(payload)
        .expect(400);
    });

    it('should reject unknown priority values', async () => {
      const payload = buildPolicyPayload('Unknown Priority') as {
        name: string;
        targets: Array<Record<string, unknown>>;
      };

      payload.targets[0].priority = 'CRITICAL';

      await organizationHeaders(owner().post('/api/v1/sla-policies'))
        .send(payload)
        .expect(400);
    });

    it('should allow multiple inactive policies in the same organization', async () => {
      const first = await createPolicy('Inactive Policy One');
      const second = await createPolicy('Inactive Policy Two');

      expect(first.body.isActive).toBe(false);
      expect(second.body.isActive).toBe(false);

      const response = await organizationHeaders(
        owner().get('/api/v1/sla-policies'),
      ).expect(200);

      expect(response.body).toHaveLength(2);
      expect(
        response.body.every((policy: SlaPolicyResponse) => !policy.isActive),
      ).toBe(true);
    });
  });

  describe('PATCH /api/v1/sla-policies/:policyId', () => {
    it('should update the policy name while the policy is active', async () => {
      const created = await createPolicy('Original Name');

      await activatePolicy(created.body.id);

      const response = await organizationHeaders(
        owner().patch(`/api/v1/sla-policies/${created.body.id}`),
      )
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(response.body.id).toBe(created.body.id);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.isActive).toBe(true);
      expect(response.body.targets).toHaveLength(4);
    });

    it('should reject target changes while the policy is active', async () => {
      const created = await createPolicy('Active Target Protection');
      await activatePolicy(created.body.id);

      await organizationHeaders(
        owner().patch(`/api/v1/sla-policies/${created.body.id}`),
      )
        .send({
          targets: buildTargets({
            LOW: {
              firstResponseMinutes: 90,
            },
          }),
        })
        .expect(409);
    });

    it('should allow target changes while the policy is inactive', async () => {
      const created = await createPolicy('Inactive Target Update');

      expect(created.body.isActive).toBe(false);

      const response = await organizationHeaders(
        owner().patch(`/api/v1/sla-policies/${created.body.id}`),
      )
        .send({
          targets: buildTargets({
            LOW: {
              firstResponseMinutes: 90,
              resolutionMinutes: 600,
            },
          }),
        })
        .expect(200);

      const lowTarget = response.body.targets.find(
        (target: SlaPolicyResponse['targets'][number]) =>
          target.priority === 'LOW',
      );

      expect(response.body.isActive).toBe(false);
      expect(lowTarget.firstResponseMinutes).toBe(90);
      expect(lowTarget.resolutionMinutes).toBe(600);
    });

    it('should reject an empty update payload', async () => {
      const created = await createPolicy('Empty Update');

      await organizationHeaders(
        owner().patch(`/api/v1/sla-policies/${created.body.id}`),
      )
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/sla-policies/:policyId/deactivate', () => {
    it('should deactivate an active policy', async () => {
      const created = await createPolicy('Deactivate Policy');

      await activatePolicy(created.body.id);
      const response = await deactivatePolicy(created.body.id);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: created.body.id,
          name: 'Deactivate Policy',
          isActive: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
    });

    it('should reject deactivation when the policy is already inactive', async () => {
      const created = await createPolicy('Already Inactive');

      await organizationHeaders(
        owner().post(`/api/v1/sla-policies/${created.body.id}/deactivate`),
      ).expect(400);
    });
  });

  describe('POST /api/v1/sla-policies/:policyId/activate', () => {
    it('should reactivate a previously deactivated policy', async () => {
      const created = await createPolicy('Reactivate Policy');

      await activatePolicy(created.body.id);
      await deactivatePolicy(created.body.id);

      const response = await activatePolicy(created.body.id);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: created.body.id,
          name: 'Reactivate Policy',
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
    });

    it('should reject activation when the policy is already active', async () => {
      const created = await createPolicy('Already Active');

      await activatePolicy(created.body.id);

      await organizationHeaders(
        owner().post(`/api/v1/sla-policies/${created.body.id}/activate`),
      ).expect(400);
    });

    it('should allow only one active policy per organization', async () => {
      const first = await createPolicy('First SLA Policy');
      const second = await createPolicy('Second SLA Policy');

      expect(first.body.isActive).toBe(false);
      expect(second.body.isActive).toBe(false);

      await activatePolicy(first.body.id);

      await organizationHeaders(
        owner().post(`/api/v1/sla-policies/${second.body.id}/activate`),
      ).expect(409);

      const secondDetails = await organizationHeaders(
        owner().get(`/api/v1/sla-policies/${second.body.id}`),
      ).expect(200);

      expect(secondDetails.body.isActive).toBe(false);
    });

    it('should support the full inactive → active → inactive → active lifecycle', async () => {
      const created = await createPolicy('Lifecycle Policy');

      expect(created.body.isActive).toBe(false);

      const activated = await activatePolicy(created.body.id);

      expect(activated.body.isActive).toBe(true);

      const deactivated = await deactivatePolicy(created.body.id);

      expect(deactivated.body.isActive).toBe(false);

      const reactivated = await activatePolicy(created.body.id);

      expect(reactivated.body.isActive).toBe(true);
    });

    it('should allow another policy to become active after the current policy is deactivated', async () => {
      const first = await createPolicy('Primary SLA Policy');
      const second = await createPolicy('Replacement SLA Policy');

      await activatePolicy(first.body.id);

      await organizationHeaders(
        owner().post(`/api/v1/sla-policies/${second.body.id}/activate`),
      ).expect(409);

      await deactivatePolicy(first.body.id);

      const activated = await activatePolicy(second.body.id);

      expect(activated.body).toEqual(
        expect.objectContaining({
          id: second.body.id,
          name: 'Replacement SLA Policy',
          isActive: true,
        }),
      );
    });
  });

  describe('DELETE /api/v1/sla-policies/:policyId', () => {
    it('should reject deletion while the policy is active', async () => {
      const created = await createPolicy('Active Delete Protection');
      await activatePolicy(created.body.id);
      await organizationHeaders(
        owner().delete(`/api/v1/sla-policies/${created.body.id}`),
      ).expect(409);
    });

    it('should delete an inactive policy', async () => {
      const created = await createPolicy('Delete Inactive Policy');

      expect(created.body.isActive).toBe(false);

      await organizationHeaders(
        owner().delete(`/api/v1/sla-policies/${created.body.id}`),
      ).expect(200);

      await organizationHeaders(
        owner().get(`/api/v1/sla-policies/${created.body.id}`),
      ).expect(404);
    });
  });

  describe('Organization isolation', () => {
    it('should not expose a policy belonging to another organization', async () => {
      const created = await createPolicy('Private SLA Policy');

      const otherFixture = await createOrganizationTestFixture(app);

      try {
        await otherFixture.owner.agent
          .get(`/api/v1/sla-policies/${created.body.id}`)
          .set('x-organization-id', otherFixture.organization.id)
          .expect(404);

        const listResponse = await otherFixture.owner.agent
          .get('/api/v1/sla-policies')
          .set('x-organization-id', otherFixture.organization.id)
          .expect(200);

        expect(listResponse.body).toEqual([]);
      } finally {
        await database.slaPolicy.deleteMany({
          where: {
            organizationId: otherFixture.organization.id,
          },
        });

        await database.organization.delete({
          where: {
            id: otherFixture.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                otherFixture.owner.userId,
                otherFixture.admin.userId,
                otherFixture.agent.userId,
                otherFixture.requester.userId,
              ],
            },
          },
        });
      }
    });

    it('should not allow another organization to update the policy', async () => {
      const created = await createPolicy('Isolation Update Policy');

      const otherFixture = await createOrganizationTestFixture(app);

      try {
        await otherFixture.owner.agent
          .patch(`/api/v1/sla-policies/${created.body.id}`)
          .set('x-organization-id', otherFixture.organization.id)
          .send({
            name: 'Cross Organization Update',
          })
          .expect(404);
      } finally {
        await database.slaPolicy.deleteMany({
          where: {
            organizationId: otherFixture.organization.id,
          },
        });

        await database.organization.delete({
          where: {
            id: otherFixture.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                otherFixture.owner.userId,
                otherFixture.admin.userId,
                otherFixture.agent.userId,
                otherFixture.requester.userId,
              ],
            },
          },
        });
      }
    });

    it('should not allow another organization to delete the policy', async () => {
      const created = await createPolicy('Isolation Delete Policy');

      const otherFixture = await createOrganizationTestFixture(app);

      try {
        await otherFixture.owner.agent
          .delete(`/api/v1/sla-policies/${created.body.id}`)
          .set('x-organization-id', otherFixture.organization.id)
          .expect(404);
      } finally {
        await database.slaPolicy.deleteMany({
          where: {
            organizationId: otherFixture.organization.id,
          },
        });

        await database.organization.delete({
          where: {
            id: otherFixture.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                otherFixture.owner.userId,
                otherFixture.admin.userId,
                otherFixture.agent.userId,
                otherFixture.requester.userId,
              ],
            },
          },
        });
      }
    });
  });

  describe('Authorization', () => {
    it('should allow REQUESTER to list SLA policies', async () => {
      await createPolicy('Requester List Policy');

      const response = await requester()
        .get('/api/v1/sla-policies')
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('should allow AGENT to list SLA policies', async () => {
      await createPolicy('Agent List Policy');

      const response = await agent()
        .get('/api/v1/sla-policies')
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('should allow REQUESTER to view an SLA policy', async () => {
      const created = await createPolicy('Requester View Policy');

      await requester()
        .get(`/api/v1/sla-policies/${created.body.id}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);
    });

    it('should allow AGENT to view an SLA policy', async () => {
      const created = await createPolicy('Agent View Policy');

      await agent()
        .get(`/api/v1/sla-policies/${created.body.id}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);
    });

    it('should reject REQUESTER from creating an SLA policy', async () => {
      await requester()
        .post('/api/v1/sla-policies')
        .set('x-organization-id', fixture.organization.id)
        .send(buildPolicyPayload('Requester Create'))
        .expect(403);
    });

    it('should reject AGENT from creating an SLA policy', async () => {
      await agent()
        .post('/api/v1/sla-policies')
        .set('x-organization-id', fixture.organization.id)
        .send(buildPolicyPayload('Agent Create'))
        .expect(403);
    });

    it('should allow ADMIN to create an SLA policy', async () => {
      const response = await admin()
        .post('/api/v1/sla-policies')
        .set('x-organization-id', fixture.organization.id)
        .send(buildPolicyPayload('Admin Create'))
        .expect(201);

      expect(response.body.name).toBe('Admin Create');
    });

    it('should allow OWNER to create an SLA policy', async () => {
      const response = await owner()
        .post('/api/v1/sla-policies')
        .set('x-organization-id', fixture.organization.id)
        .send(buildPolicyPayload('Owner Create'))
        .expect(201);

      expect(response.body.name).toBe('Owner Create');
    });

    it('should reject REQUESTER from updating an SLA policy', async () => {
      const created = await createPolicy('Requester Update Policy');

      await requester()
        .patch(`/api/v1/sla-policies/${created.body.id}`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          name: 'Requester Updated',
        })
        .expect(403);
    });

    it('should reject AGENT from deleting an SLA policy', async () => {
      const created = await createPolicy('Agent Delete Policy');

      await agent()
        .delete(`/api/v1/sla-policies/${created.body.id}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(403);
    });

    it('should allow ADMIN to delete an inactive SLA policy', async () => {
      const created = await createPolicy('Admin Delete Policy');

      expect(created.body.isActive).toBe(false);

      await admin()
        .delete(`/api/v1/sla-policies/${created.body.id}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      await owner()
        .get(`/api/v1/sla-policies/${created.body.id}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(404);
    });

    it('should allow OWNER to delete an inactive SLA policy', async () => {
      const created = await createPolicy('Owner Delete Policy');

      expect(created.body.isActive).toBe(false);

      await owner()
        .delete(`/api/v1/sla-policies/${created.body.id}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      await owner()
        .get(`/api/v1/sla-policies/${created.body.id}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(404);
    });
  });
});
