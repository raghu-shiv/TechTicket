import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

describe('Tickets API (e2e)', () => {
  let app: INestApplication;

  let database: DatabaseService;

  let fixture: OrganizationTestFixture;

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);

    fixture = await createOrganizationTestFixture(app);
  });

  afterAll(async () => {
    if (fixture) {
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

    await app.close();
  });

  describe('POST /api/v1/tickets', () => {
    it('should create a ticket for the authenticated requester', async () => {
      const response = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Unable to connect to VPN',

          description:
            'The VPN connection fails after entering valid credentials.',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        })

        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),

          ticketNumber: expect.any(String),

          organizationId: fixture.organization.id,

          requesterId: fixture.requester.userId,

          title: 'Unable to connect to VPN',

          description:
            'The VPN connection fails after entering valid credentials.',

          status: 'OPEN',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        }),
      );
    });
  });

  describe('GET /api/v1/tickets/:ticketId', () => {
    it('should retrieve a ticket within the current organization', async () => {
      const createResponse = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Cannot access company email',

          description:
            'The user receives an authentication error when accessing company email.',

          priority: 'HIGH',

          type: 'INCIDENT',
        })

        .expect(201);

      const ticketId = createResponse.body.id;

      const response = await fixture.requester.agent

        .get(`/api/v1/tickets/${ticketId}`)

        .set('x-organization-id', fixture.organization.id)

        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: ticketId,

          ticketNumber: expect.any(String),

          organizationId: fixture.organization.id,

          requesterId: fixture.requester.userId,

          title: 'Cannot access company email',

          description:
            'The user receives an authentication error when accessing company email.',

          status: 'OPEN',

          priority: 'HIGH',

          type: 'INCIDENT',
        }),
      );
    });

    it('should return 404 when the ticket does not exist', async () => {
      const nonExistentTicketId = 'cm00000000000000000000000';

      await fixture.requester.agent

        .get(`/api/v1/tickets/${nonExistentTicketId}`)

        .set('x-organization-id', fixture.organization.id)

        .expect(404);
    });
  });

  describe('GET /api/v1/tickets', () => {
    it('should list tickets belonging to the current organization', async () => {
      const firstTicket = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Laptop performance issue',

          description: 'The laptop has become extremely slow.',

          priority: 'LOW',

          type: 'INCIDENT',
        })

        .expect(201);

      const secondTicket = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'VPN access problem',

          description: 'Unable to establish a VPN connection.',

          priority: 'HIGH',

          type: 'INCIDENT',
        })

        .expect(201);

      const response = await fixture.requester.agent

        .get('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          data: expect.any(Array),

          meta: expect.objectContaining({
            page: expect.any(Number),

            limit: expect.any(Number),

            total: expect.any(Number),

            totalPages: expect.any(Number),
          }),
        }),
      );

      expect(response.body.data.length).toBeGreaterThan(0);

      expect(
        response.body.data.every(
          (ticket: { organizationId: string }) =>
            ticket.organizationId === fixture.organization.id,
        ),
      ).toBe(true);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: firstTicket.body.id,

            organizationId: fixture.organization.id,

            title: 'Laptop performance issue',
          }),

          expect.objectContaining({
            id: secondTicket.body.id,

            organizationId: fixture.organization.id,

            title: 'VPN access problem',
          }),
        ]),
      );
    });

    it('should return only unassigned tickets when unassigned=true', async () => {
      const unassignedTicket = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '4-I.2 Unassigned Ticket',
          description: 'Ticket used to verify unassigned queue filtering.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const assignedTicket = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '4-I.2 Assigned Ticket',
          description: 'Ticket used to verify assigned tickets are excluded.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      await fixture.agent.agent
        .patch(`/api/v1/tickets/${assignedTicket.body.id}/assignment`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          assigneeId: fixture.agent.userId,
        })
        .expect(200);

      const response = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          unassigned: true,
        })
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: unassignedTicket.body.id,
            assigneeId: null,
          }),
        ]),
      );

      expect(response.body.data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: assignedTicket.body.id,
          }),
        ]),
      );

      expect(
        response.body.data.every(
          (ticket: { assigneeId: string | null }) => ticket.assigneeId === null,
        ),
      ).toBe(true);
    });

    it('should remove a ticket from the unassigned queue after assignment', async () => {
      const createResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '4-I.2 Assignment Transition',
          description:
            'Ticket used to verify queue membership after assignment.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = createResponse.body.id;

      const beforeAssignment = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          unassigned: true,
        })
        .expect(200);

      expect(beforeAssignment.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ticketId,
            assigneeId: null,
          }),
        ]),
      );

      await fixture.agent.agent
        .patch(`/api/v1/tickets/${ticketId}/assignment`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          assigneeId: fixture.agent.userId,
        })
        .expect(200);

      const afterAssignment = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          unassigned: true,
        })
        .expect(200);

      expect(afterAssignment.body.data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ticketId,
          }),
        ]),
      );

      expect(
        afterAssignment.body.data.every(
          (ticket: { assigneeId: string | null }) => ticket.assigneeId === null,
        ),
      ).toBe(true);
    });

    it('should return a ticket to the unassigned queue after unassignment', async () => {
      const createResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '4-I.2 Unassignment Transition',
          description:
            'Ticket used to verify queue membership after unassignment.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = createResponse.body.id;

      await fixture.agent.agent
        .patch(`/api/v1/tickets/${ticketId}/assignment`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          assigneeId: fixture.agent.userId,
        })
        .expect(200);

      const assignedQueue = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          unassigned: true,
        })
        .expect(200);

      expect(assignedQueue.body.data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ticketId,
          }),
        ]),
      );

      await fixture.agent.agent
        .patch(`/api/v1/tickets/${ticketId}/assignment`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          assigneeId: null,
        })
        .expect(200);

      const unassignedQueue = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          unassigned: true,
        })
        .expect(200);

      expect(unassignedQueue.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ticketId,
            assigneeId: null,
          }),
        ]),
      );
    });

    it('should return only assigned tickets when unassigned=false', async () => {
      const unassignedTicket = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '4-I.2 False Filter Unassigned',
          description: 'Ticket used to verify unassigned=false.',
          priority: 'LOW',
          type: 'INCIDENT',
        })
        .expect(201);

      const assignedTicket = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '4-I.2 False Filter Assigned',
          description: 'Ticket used to verify assigned filtering.',
          priority: 'LOW',
          type: 'INCIDENT',
        })
        .expect(201);

      await fixture.agent.agent
        .patch(`/api/v1/tickets/${assignedTicket.body.id}/assignment`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          assigneeId: fixture.agent.userId,
        })
        .expect(200);

      const response = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          unassigned: false,
        })
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: assignedTicket.body.id,
            assigneeId: fixture.agent.userId,
          }),
        ]),
      );

      expect(response.body.data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: unassignedTicket.body.id,
          }),
        ]),
      );

      expect(
        response.body.data.every(
          (ticket: { assigneeId: string | null }) => ticket.assigneeId !== null,
        ),
      ).toBe(true);
    });

    describe('4-I.3 --- Dedicated unassigned queue API coverage', () => {
      it('should expose the unassigned queue through the ticket list endpoint', async () => {
        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
          })
          .expect(200);

        expect(response.body).toEqual(
          expect.objectContaining({
            data: expect.any(Array),
            meta: expect.objectContaining({
              page: 1,
              limit: 20,
              total: expect.any(Number),
              totalPages: expect.any(Number),
            }),
          }),
        );

        expect(
          response.body.data.every(
            (ticket: { assigneeId: string | null }) =>
              ticket.assigneeId === null,
          ),
        ).toBe(true);
      });

      it('should return the expected paginated response shape for the unassigned queue', async () => {
        await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.3 Queue Contract One',
            description: 'Dedicated API coverage ticket one.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.3 Queue Contract Two',
            description: 'Dedicated API coverage ticket two.',
            priority: 'MEDIUM',
            type: 'INCIDENT',
          })
          .expect(201);

        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            page: 1,
            limit: 1,
          })
          .expect(200);

        expect(response.body).toEqual(
          expect.objectContaining({
            data: expect.any(Array),
            meta: expect.objectContaining({
              page: 1,
              limit: 1,
              total: expect.any(Number),
              totalPages: expect.any(Number),
            }),
          }),
        );

        expect(response.body.data.length).toBeLessThanOrEqual(1);

        expect(
          response.body.data.every(
            (ticket: { assigneeId: string | null }) =>
              ticket.assigneeId === null,
          ),
        ).toBe(true);
      });

      it('should honor the unassigned filter together with ticket status filtering', async () => {
        const openTicket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.3 Open Unassigned Ticket',
            description: 'Unassigned OPEN ticket for API filter coverage.',
            priority: 'MEDIUM',
            type: 'INCIDENT',
          })
          .expect(201);

        const pendingTicket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.3 Pending Unassigned Ticket',
            description: 'Unassigned PENDING ticket for API filter coverage.',
            priority: 'MEDIUM',
            type: 'INCIDENT',
          })
          .expect(201);

        await fixture.agent.agent
          .patch(`/api/v1/tickets/${pendingTicket.body.id}/status`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            status: 'PENDING',
          })
          .expect(200);

        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            status: 'PENDING',
          })
          .expect(200);

        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: pendingTicket.body.id,
              assigneeId: null,
              status: 'PENDING',
            }),
          ]),
        );

        expect(response.body.data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: openTicket.body.id,
            }),
          ]),
        );

        expect(
          response.body.data.every(
            (ticket: { assigneeId: string | null; status: string }) =>
              ticket.assigneeId === null && ticket.status === 'PENDING',
          ),
        ).toBe(true);
      });

      it('should honor the unassigned filter together with ticket priority filtering', async () => {
        const lowTicket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.3 Low Priority Queue Ticket',
            description: 'Unassigned LOW ticket.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        const highTicket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.3 High Priority Queue Ticket',
            description: 'Unassigned HIGH ticket.',
            priority: 'HIGH',
            type: 'INCIDENT',
          })
          .expect(201);

        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            priority: 'HIGH',
          })
          .expect(200);

        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: highTicket.body.id,
              assigneeId: null,
              priority: 'HIGH',
            }),
          ]),
        );

        expect(response.body.data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: lowTicket.body.id,
            }),
          ]),
        );

        expect(
          response.body.data.every(
            (ticket: { assigneeId: string | null; priority: string }) =>
              ticket.assigneeId === null && ticket.priority === 'HIGH',
          ),
        ).toBe(true);
      });

      it('should honor search within the unassigned queue', async () => {
        const matchingTicket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.3 Unique VPN Queue Incident',
            description: 'Dedicated search target for the unassigned queue.',
            priority: 'HIGH',
            type: 'INCIDENT',
          })
          .expect(201);

        await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.3 Different Queue Incident',
            description: 'Should not match the dedicated search.',
            priority: 'HIGH',
            type: 'INCIDENT',
          })
          .expect(201);

        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            search: 'Unique VPN Queue',
          })
          .expect(200);

        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: matchingTicket.body.id,
              assigneeId: null,
            }),
          ]),
        );

        expect(
          response.body.data.every(
            (ticket: { assigneeId: string | null; id: string }) =>
              ticket.assigneeId === null,
          ),
        ).toBe(true);
      });

      it('should return an empty data array when the requested unassigned page is beyond the available results', async () => {
        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            page: 999,
            limit: 20,
          })
          .expect(200);

        expect(response.body).toEqual(
          expect.objectContaining({
            data: [],
            meta: expect.objectContaining({
              page: 999,
              limit: 20,
              total: expect.any(Number),
              totalPages: expect.any(Number),
            }),
          }),
        );
      });
    });

    describe('4-I.4 --- Authorization and organization isolation', () => {
      it('should reject unauthenticated access to the unassigned queue', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
          })
          .expect(401);

        expect(response.body).toMatchObject({
          message: 'Authentication required',
          error: 'Unauthorized',
          statusCode: 401,
        });
      });

      it('should reject authenticated access to the unassigned queue without organization context', async () => {
        const response = await fixture.agent.agent
          .get('/api/v1/tickets')
          .query({
            unassigned: true,
          })
          .expect(401);

        expect(response.body).toMatchObject({
          message: 'Organization context is required',
          error: 'Unauthorized',
          statusCode: 401,
        });
      });

      it('should reject a user who is not a member of the requested organization', async () => {
        const otherFixture = await createOrganizationTestFixture(app);

        try {
          const response = await otherFixture.agent.agent
            .get('/api/v1/tickets')
            .set('x-organization-id', fixture.organization.id)
            .query({
              unassigned: true,
            })
            .expect(403);

          expect(response.body).toMatchObject({
            message: 'You do not have access to this organization',
            error: 'Forbidden',
            statusCode: 403,
          });
        } finally {
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

      it('should not expose unassigned tickets from another organization', async () => {
        const otherFixture = await createOrganizationTestFixture(app);

        try {
          const ownTicket = await fixture.requester.agent
            .post('/api/v1/tickets')
            .set('x-organization-id', fixture.organization.id)
            .send({
              title: '4-I.4 Own Unassigned Ticket',
              description:
                'Unassigned ticket belonging to the current organization.',
              priority: 'MEDIUM',
              type: 'INCIDENT',
            })
            .expect(201);

          const foreignTicket = await otherFixture.requester.agent
            .post('/api/v1/tickets')
            .set('x-organization-id', otherFixture.organization.id)
            .send({
              title: '4-I.4 Foreign Unassigned Ticket',
              description:
                'Unassigned ticket belonging to another organization.',
              priority: 'MEDIUM',
              type: 'INCIDENT',
            })
            .expect(201);

          const response = await fixture.agent.agent
            .get('/api/v1/tickets')
            .set('x-organization-id', fixture.organization.id)
            .query({
              unassigned: true,
            })
            .expect(200);

          expect(response.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: ownTicket.body.id,
                organizationId: fixture.organization.id,
                assigneeId: null,
              }),
            ]),
          );

          expect(response.body.data).not.toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: foreignTicket.body.id,
                organizationId: otherFixture.organization.id,
              }),
            ]),
          );

          expect(
            response.body.data.every(
              (ticket: { organizationId: string; assigneeId: string | null }) =>
                ticket.organizationId === fixture.organization.id &&
                ticket.assigneeId === null,
            ),
          ).toBe(true);
        } finally {
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

      it('should allow an authenticated organization member to access the unassigned queue', async () => {
        const ticket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.4 Member Queue Access',
            description:
              'Unassigned ticket used to verify organization member access.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
          })
          .expect(200);

        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: ticket.body.id,
              organizationId: fixture.organization.id,
              assigneeId: null,
            }),
          ]),
        );
      });
    });

    describe('4-I.5 --- Sorting, pagination, and filter interaction', () => {
      it('should preserve unassigned filtering across pagination', async () => {
        const createdTickets: string[] = [];

        for (let index = 1; index <= 3; index += 1) {
          const response = await fixture.requester.agent
            .post('/api/v1/tickets')
            .set('x-organization-id', fixture.organization.id)
            .send({
              title: `4-I.5 Pagination Isolation ${index}`,
              description: `4-I.5 Pagination Isolation test ticket ${index}.`,
              priority: 'MEDIUM',
              type: 'INCIDENT',
            })
            .expect(201);

          createdTickets.push(response.body.id);
        }

        const pageOne = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            search: '4-I.5 Pagination Isolation',
            page: 1,
            limit: 2,
            sortBy: 'createdAt',
            sortOrder: 'asc',
          })
          .expect(200);

        const pageTwo = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            search: '4-I.5 Pagination Isolation',
            page: 2,
            limit: 2,
            sortBy: 'createdAt',
            sortOrder: 'asc',
          })
          .expect(200);

        expect(pageOne.body.meta.page).toBe(1);
        expect(pageOne.body.meta.limit).toBe(2);

        expect(pageTwo.body.meta.page).toBe(2);
        expect(pageTwo.body.meta.limit).toBe(2);

        expect(pageOne.body.meta.total).toBe(3);
        expect(pageOne.body.meta.totalPages).toBe(2);

        expect(pageOne.body.data).toHaveLength(2);
        expect(pageTwo.body.data).toHaveLength(1);

        const returnedTickets = [...pageOne.body.data, ...pageTwo.body.data];

        const returnedIds = returnedTickets.map(
          (ticket: { id: string }) => ticket.id,
        );

        expect(returnedIds).toEqual(expect.arrayContaining(createdTickets));

        expect(new Set(returnedIds).size).toBe(3);

        expect(
          returnedTickets.every(
            (ticket: { assigneeId: string | null }) =>
              ticket.assigneeId === null,
          ),
        ).toBe(true);
      });

      it('should sort unassigned tickets by title ascending', async () => {
        const ticketC = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Sort C',
            description: 'Sorting test C.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        const ticketA = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Sort A',
            description: 'Sorting test A.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        const ticketB = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Sort B',
            description: 'Sorting test B.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            sortBy: 'title',
            sortOrder: 'asc',
          })
          .expect(200);

        const relevantTickets = response.body.data.filter(
          (ticket: { id: string }) =>
            [ticketA.body.id, ticketB.body.id, ticketC.body.id].includes(
              ticket.id,
            ),
        );

        expect(relevantTickets).toHaveLength(3);

        expect(
          relevantTickets.map((ticket: { title: string }) => ticket.title),
        ).toEqual(['4-I.5 Sort A', '4-I.5 Sort B', '4-I.5 Sort C']);

        expect(
          relevantTickets.every(
            (ticket: { assigneeId: string | null }) =>
              ticket.assigneeId === null,
          ),
        ).toBe(true);
      });

      it('should sort unassigned tickets by title descending', async () => {
        const ticketA = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Desc A',
            description: 'Descending sorting test A.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        const ticketB = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Desc B',
            description: 'Descending sorting test B.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        const ticketC = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Desc C',
            description: 'Descending sorting test C.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            sortBy: 'title',
            sortOrder: 'desc',
          })
          .expect(200);

        const relevantTickets = response.body.data.filter(
          (ticket: { id: string }) =>
            [ticketA.body.id, ticketB.body.id, ticketC.body.id].includes(
              ticket.id,
            ),
        );

        expect(relevantTickets).toHaveLength(3);

        expect(
          relevantTickets.map((ticket: { title: string }) => ticket.title),
        ).toEqual(['4-I.5 Desc C', '4-I.5 Desc B', '4-I.5 Desc A']);

        expect(
          relevantTickets.every(
            (ticket: { assigneeId: string | null }) =>
              ticket.assigneeId === null,
          ),
        ).toBe(true);
      });

      it('should combine unassigned filtering with search and priority', async () => {
        const matchingTicket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Critical VPN Queue',
            description: 'Specific search target for combined filter coverage.',
            priority: 'HIGH',
            type: 'INCIDENT',
          })
          .expect(201);

        const wrongPriority = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Critical VPN Queue',
            description: 'Same search terms but wrong priority.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        const wrongSearch = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Network Queue',
            description: 'Wrong search target.',
            priority: 'HIGH',
            type: 'INCIDENT',
          })
          .expect(201);

        const assignedMatchingTicket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Critical VPN Queue',
            description: 'Assigned ticket must not enter queue.',
            priority: 'HIGH',
            type: 'INCIDENT',
          })
          .expect(201);

        await fixture.agent.agent
          .patch(`/api/v1/tickets/${assignedMatchingTicket.body.id}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: fixture.agent.userId,
          })
          .expect(200);

        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            search: 'Critical VPN Queue',
            priority: 'HIGH',
          })
          .expect(200);

        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: matchingTicket.body.id,
              assigneeId: null,
              priority: 'HIGH',
            }),
          ]),
        );

        expect(response.body.data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: wrongPriority.body.id,
            }),
          ]),
        );

        expect(response.body.data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: wrongSearch.body.id,
            }),
          ]),
        );

        expect(response.body.data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: assignedMatchingTicket.body.id,
            }),
          ]),
        );

        expect(
          response.body.data.every(
            (ticket: { assigneeId: string | null; priority: string }) =>
              ticket.assigneeId === null && ticket.priority === 'HIGH',
          ),
        ).toBe(true);
      });

      it('should preserve unassigned filtering when sorting by priority', async () => {
        const lowTicket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Priority Isolation',
            description: 'LOW priority sorting test.',
            priority: 'LOW',
            type: 'INCIDENT',
          })
          .expect(201);

        const highTicket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Priority Isolation',
            description: 'HIGH priority sorting test.',
            priority: 'HIGH',
            type: 'INCIDENT',
          })
          .expect(201);

        const mediumTicket = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.5 Priority Isolation',
            description: 'MEDIUM priority sorting test.',
            priority: 'MEDIUM',
            type: 'INCIDENT',
          })
          .expect(201);

        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            search: '4-I.5 Priority Isolation',
            sortBy: 'priority',
            sortOrder: 'asc',
            page: 1,
            limit: 10,
          })
          .expect(200);

        expect(response.body.meta.total).toBe(3);
        expect(response.body.data).toHaveLength(3);

        const relevantTickets = response.body.data;

        expect(
          relevantTickets.map((ticket: { id: string }) => ticket.id),
        ).toEqual([
          lowTicket.body.id,
          mediumTicket.body.id,
          highTicket.body.id,
        ]);

        expect(
          relevantTickets.map(
            (ticket: { priority: string }) => ticket.priority,
          ),
        ).toEqual(['LOW', 'MEDIUM', 'HIGH']);

        expect(
          relevantTickets.every(
            (ticket: { assigneeId: string | null }) =>
              ticket.assigneeId === null,
          ),
        ).toBe(true);
      });

      it('should reject an unsupported sort field', async () => {
        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            sortBy: 'assigneeId',
          })
          .expect(400);

        expect(response.body).toMatchObject({
          error: 'Bad Request',
          statusCode: 400,
        });
      });

      it('should reject an unsupported sort direction', async () => {
        const response = await fixture.requester.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            sortBy: 'title',
            sortOrder: 'sideways',
          })
          .expect(400);

        expect(response.body).toMatchObject({
          error: 'Bad Request',
          statusCode: 400,
        });
      });
    });

    describe('4-I.6 --- Assignment transition coverage', () => {
      it('should transition an unassigned ticket into an assigned state', async () => {
        const createResponse = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.6 Assign Transition',
            description:
              'Ticket used to verify unassigned to assigned transition.',
            priority: 'MEDIUM',
            type: 'INCIDENT',
          })
          .expect(201);

        const ticketId = createResponse.body.id;

        expect(createResponse.body.assigneeId).toBeNull();

        const assignmentResponse = await fixture.agent.agent
          .patch(`/api/v1/tickets/${ticketId}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: fixture.agent.userId,
          })
          .expect(200);

        expect(assignmentResponse.body).toEqual(
          expect.objectContaining({
            id: ticketId,
            organizationId: fixture.organization.id,
            assigneeId: fixture.agent.userId,
          }),
        );

        const ticketResponse = await fixture.agent.agent
          .get(`/api/v1/tickets/${ticketId}`)
          .set('x-organization-id', fixture.organization.id)
          .expect(200);

        expect(ticketResponse.body).toEqual(
          expect.objectContaining({
            id: ticketId,
            organizationId: fixture.organization.id,
            assigneeId: fixture.agent.userId,
          }),
        );
      });

      it('should transition an assigned ticket into an unassigned state', async () => {
        const createResponse = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.6 Unassign Transition',
            description:
              'Ticket used to verify assigned to unassigned transition.',
            priority: 'MEDIUM',
            type: 'INCIDENT',
          })
          .expect(201);

        const ticketId = createResponse.body.id;

        await fixture.agent.agent
          .patch(`/api/v1/tickets/${ticketId}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: fixture.agent.userId,
          })
          .expect(200);

        const unassignmentResponse = await fixture.agent.agent
          .patch(`/api/v1/tickets/${ticketId}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: null,
          })
          .expect(200);

        expect(unassignmentResponse.body).toEqual(
          expect.objectContaining({
            id: ticketId,
            organizationId: fixture.organization.id,
            assigneeId: null,
          }),
        );

        const ticketResponse = await fixture.agent.agent
          .get(`/api/v1/tickets/${ticketId}`)
          .set('x-organization-id', fixture.organization.id)
          .expect(200);

        expect(ticketResponse.body).toEqual(
          expect.objectContaining({
            id: ticketId,
            organizationId: fixture.organization.id,
            assigneeId: null,
          }),
        );
      });

      it('should allow a ticket to cycle from unassigned to assigned and back to unassigned', async () => {
        const createResponse = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.6 Assignment Cycle',
            description:
              'Ticket used to verify repeated assignment transitions.',
            priority: 'HIGH',
            type: 'INCIDENT',
          })
          .expect(201);

        const ticketId = createResponse.body.id;

        expect(createResponse.body.assigneeId).toBeNull();

        const firstAssignment = await fixture.agent.agent
          .patch(`/api/v1/tickets/${ticketId}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: fixture.agent.userId,
          })
          .expect(200);

        expect(firstAssignment.body.assigneeId).toBe(fixture.agent.userId);

        const unassignment = await fixture.agent.agent
          .patch(`/api/v1/tickets/${ticketId}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: null,
          })
          .expect(200);

        expect(unassignment.body.assigneeId).toBeNull();

        const secondAssignment = await fixture.agent.agent
          .patch(`/api/v1/tickets/${ticketId}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: fixture.agent.userId,
          })
          .expect(200);

        expect(secondAssignment.body.assigneeId).toBe(fixture.agent.userId);

        const finalUnassignment = await fixture.agent.agent
          .patch(`/api/v1/tickets/${ticketId}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: null,
          })
          .expect(200);

        expect(finalUnassignment.body.assigneeId).toBeNull();

        const finalTicket = await fixture.agent.agent
          .get(`/api/v1/tickets/${ticketId}`)
          .set('x-organization-id', fixture.organization.id)
          .expect(200);

        expect(finalTicket.body.assigneeId).toBeNull();
      });

      it('should remove and restore a ticket from the unassigned queue across assignment transitions', async () => {
        const createResponse = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-I.6 Queue Transition',
            description:
              'Ticket used to verify queue membership across assignment transitions.',
            priority: 'HIGH',
            type: 'INCIDENT',
          })
          .expect(201);

        const ticketId = createResponse.body.id;

        // Initial state: unassigned → must be in the queue.
        const initialQueue = await fixture.agent.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            search: '4-I.6 Queue Transition',
          })
          .expect(200);

        expect(initialQueue.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: ticketId,
              assigneeId: null,
            }),
          ]),
        );

        // Transition: unassigned → assigned.
        await fixture.agent.agent
          .patch(`/api/v1/tickets/${ticketId}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: fixture.agent.userId,
          })
          .expect(200);

        const assignedQueue = await fixture.agent.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            search: '4-I.6 Queue Transition',
          })
          .expect(200);

        expect(assignedQueue.body.data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: ticketId,
            }),
          ]),
        );

        // Transition: assigned → unassigned.
        await fixture.agent.agent
          .patch(`/api/v1/tickets/${ticketId}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: null,
          })
          .expect(200);

        const restoredQueue = await fixture.agent.agent
          .get('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .query({
            unassigned: true,
            search: '4-I.6 Queue Transition',
          })
          .expect(200);

        expect(restoredQueue.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: ticketId,
              assigneeId: null,
            }),
          ]),
        );
      });
    });
  });

  describe('PATCH /api/v1/tickets/:ticketId/assignment', () => {
    it('should assign a ticket to an AGENT in the current organization', async () => {
      const createResponse = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Assignment test ticket',

          description: 'Ticket used to verify assignment.',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        })

        .expect(201);

      const ticketId = createResponse.body.id;

      const response = await fixture.agent.agent

        .patch(`/api/v1/tickets/${ticketId}/assignment`)

        .set('x-organization-id', fixture.organization.id)

        .send({
          assigneeId: fixture.agent.userId,
        })

        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: ticketId,

          organizationId: fixture.organization.id,

          assigneeId: fixture.agent.userId,
        }),
      );
    });

    it('should allow an authorized member to unassign a ticket', async () => {
      const createResponse = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Unassignment test ticket',

          description: 'Ticket used to verify unassignment.',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        })

        .expect(201);

      const ticketId = createResponse.body.id;

      await fixture.agent.agent

        .patch(`/api/v1/tickets/${ticketId}/assignment`)

        .set('x-organization-id', fixture.organization.id)

        .send({
          assigneeId: fixture.agent.userId,
        })

        .expect(200);

      const response = await fixture.agent.agent

        .patch(`/api/v1/tickets/${ticketId}/assignment`)

        .set('x-organization-id', fixture.organization.id)

        .send({
          assigneeId: null,
        })

        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: ticketId,

          organizationId: fixture.organization.id,

          assigneeId: null,
        }),
      );
    });

    it('should reject assigning a ticket to a REQUESTER', async () => {
      const createResponse = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Requester assignment test',

          description: 'Ticket used to verify requester restrictions.',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        })

        .expect(201);

      const ticketId = createResponse.body.id;

      const response = await fixture.agent.agent

        .patch(`/api/v1/tickets/${ticketId}/assignment`)

        .set('x-organization-id', fixture.organization.id)

        .send({
          assigneeId: fixture.requester.userId,
        })

        .expect(400);

      expect(response.body).toMatchObject({
        message: 'REQUESTER users cannot be assigned tickets',

        error: 'Bad Request',

        statusCode: 400,
      });
    });

    it('should reject assigning a ticket to a user outside the organization', async () => {
      const createResponse = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Cross organization assignment test',

          description: 'Ticket used to verify assignment isolation.',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        })

        .expect(201);

      const ticketId = createResponse.body.id;

      const outsideUser = await database.user.create({
        data: {
          id: randomUUID(),

          name: 'Outside Assignment User',

          email: `outside-assignment-${randomUUID()}@example.com`,
        },

        select: {
          id: true,
        },
      });

      try {
        const response = await fixture.agent.agent

          .patch(`/api/v1/tickets/${ticketId}/assignment`)

          .set('x-organization-id', fixture.organization.id)

          .send({
            assigneeId: outsideUser.id,
          })

          .expect(400);

        expect(response.body).toMatchObject({
          message: 'Assignee must be a member of this organization',

          error: 'Bad Request',

          statusCode: 400,
        });
      } finally {
        await database.user.delete({
          where: {
            id: outsideUser.id,
          },
        });
      }
    });

    it('should reject assignment mutation by a REQUESTER', async () => {
      const createResponse = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Requester authorization test',

          description: 'Ticket used to verify assignment authorization.',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        })

        .expect(201);

      const ticketId = createResponse.body.id;

      await fixture.requester.agent

        .patch(`/api/v1/tickets/${ticketId}/assignment`)

        .set('x-organization-id', fixture.organization.id)

        .send({
          assigneeId: fixture.agent.userId,
        })

        .expect(403);
    });

    it('should reject assignment when the ticket belongs to another organization', async () => {
      const otherFixture = await createOrganizationTestFixture(app);

      try {
        const otherTicket = await otherFixture.requester.agent

          .post('/api/v1/tickets')

          .set('x-organization-id', otherFixture.organization.id)

          .send({
            title: 'Foreign organization ticket',

            description: 'Ticket used to verify assignment isolation.',

            priority: 'MEDIUM',

            type: 'INCIDENT',
          })

          .expect(201);

        await fixture.agent.agent

          .patch(`/api/v1/tickets/${otherTicket.body.id}/assignment`)

          .set('x-organization-id', fixture.organization.id)

          .send({
            assigneeId: fixture.agent.userId,
          })

          .expect(404);
      } finally {
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

  describe('PATCH /api/v1/tickets/:ticketId/status', () => {
    it('should update the ticket status within the current organization', async () => {
      const createResponse = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Status workflow test',

          description: 'Ticket used to verify status transitions.',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        })

        .expect(201);

      const ticketId = createResponse.body.id;

      const response = await fixture.agent.agent

        .patch(`/api/v1/tickets/${ticketId}/status`)

        .set('x-organization-id', fixture.organization.id)

        .send({
          status: 'IN_PROGRESS',
        })

        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: ticketId,

          organizationId: fixture.organization.id,

          status: 'IN_PROGRESS',
        }),
      );
    });

    it('should allow a ticket to transition through the supported workflow', async () => {
      const createResponse = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Status transition workflow',

          description: 'Ticket used to verify multiple status transitions.',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        })

        .expect(201);

      const ticketId = createResponse.body.id;

      const statuses = ['IN_PROGRESS', 'RESOLVED', 'CLOSED'];

      for (const status of statuses) {
        const response = await fixture.agent.agent

          .patch(`/api/v1/tickets/${ticketId}/status`)

          .set('x-organization-id', fixture.organization.id)

          .send({ status })

          .expect(200);

        expect(response.body).toEqual(
          expect.objectContaining({
            id: ticketId,

            organizationId: fixture.organization.id,

            status,
          }),
        );
      }
    });

    it('should reject an invalid status value', async () => {
      const createResponse = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Invalid status test',

          description: 'Ticket used to verify status validation.',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        })

        .expect(201);

      await fixture.agent.agent

        .patch(`/api/v1/tickets/${createResponse.body.id}/status`)

        .set('x-organization-id', fixture.organization.id)

        .send({
          status: 'INVALID_STATUS',
        })

        .expect(400);
    });

    it('should reject a requester from changing ticket status', async () => {
      const createResponse = await fixture.requester.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Requester status authorization',

          description: 'Ticket used to verify status authorization.',

          priority: 'MEDIUM',

          type: 'INCIDENT',
        })

        .expect(201);

      await fixture.requester.agent

        .patch(`/api/v1/tickets/${createResponse.body.id}/status`)

        .set('x-organization-id', fixture.organization.id)

        .send({
          status: 'IN_PROGRESS',
        })

        .expect(403);
    });

    it('should not allow status changes to a ticket from another organization', async () => {
      const otherFixture = await createOrganizationTestFixture(app);

      try {
        const otherTicket = await otherFixture.requester.agent

          .post('/api/v1/tickets')

          .set('x-organization-id', otherFixture.organization.id)

          .send({
            title: 'Foreign status ticket',

            description: 'Ticket used to verify status isolation.',

            priority: 'MEDIUM',

            type: 'INCIDENT',
          })

          .expect(201);

        await fixture.agent.agent

          .patch(`/api/v1/tickets/${otherTicket.body.id}/status`)

          .set('x-organization-id', fixture.organization.id)

          .send({
            status: 'IN_PROGRESS',
          })

          .expect(404);
      } finally {
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

  describe('Comments + activity', () => {
    it('should create and list a public comment', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Public comment test',
          description: 'Testing public ticket comments.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const createResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'This is a public comment.',
          type: 'PUBLIC',
        })
        .expect(201);

      expect(createResponse.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          ticketId,
          authorId: fixture.requester.userId,
          body: 'This is a public comment.',
          type: 'PUBLIC',
        }),
      );

      const listResponse = await fixture.requester.agent
        .get(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(listResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createResponse.body.id,
            ticketId,
            authorId: fixture.requester.userId,
            body: 'This is a public comment.',
            type: 'PUBLIC',
          }),
        ]),
      );
    });

    it('should allow an authorized member to create an internal comment', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Internal comment test',
          description: 'Testing internal ticket comments.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const response = await fixture.agent.agent
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Internal agent-only comment.',
          type: 'INTERNAL',
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          ticketId,
          authorId: fixture.agent.userId,
          body: 'Internal agent-only comment.',
          type: 'INTERNAL',
        }),
      );
    });

    it('should not allow a requester to create an internal comment', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Requester internal comment test',
          description: 'Testing internal comment authorization.',
          priority: 'LOW',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Requester should not create this.',
          type: 'INTERNAL',
        })
        .expect(403);
    });

    it('should hide internal comments from requesters', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Internal visibility test',
          description: 'Testing comment visibility.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const publicComment = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Requester-visible public comment.',
          type: 'PUBLIC',
        })
        .expect(201);

      const internalComment = await fixture.agent.agent
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Agent-only internal comment.',
          type: 'INTERNAL',
        })
        .expect(201);

      const requesterResponse = await fixture.requester.agent
        .get(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(requesterResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: publicComment.body.id,
            body: 'Requester-visible public comment.',
            type: 'PUBLIC',
          }),
        ]),
      );

      expect(
        requesterResponse.body.some(
          (comment: { id: string }) => comment.id === internalComment.body.id,
        ),
      ).toBe(false);
    });

    it('should allow an author to update their own comment', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Comment update test',
          description: 'Testing comment editing.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const commentResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Original comment.',
          type: 'PUBLIC',
        })
        .expect(201);

      const commentId = commentResponse.body.id;

      const updateResponse = await fixture.requester.agent
        .patch(`/api/v1/tickets/${ticketId}/comments/${commentId}`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Updated comment.',
        })
        .expect(200);

      expect(updateResponse.body).toEqual(
        expect.objectContaining({
          id: commentId,
          ticketId,
          authorId: fixture.requester.userId,
          body: 'Updated comment.',
          type: 'PUBLIC',
        }),
      );
    });

    it('should not allow another non-admin member to edit someone else comment', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Comment authorization test',
          description: 'Testing comment ownership.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const commentResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Requester-owned comment.',
          type: 'PUBLIC',
        })
        .expect(201);

      await fixture.agent.agent
        .patch(
          `/api/v1/tickets/${ticketId}/comments/${commentResponse.body.id}`,
        )
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Agent should not modify this comment.',
        })
        .expect(403);
    });

    it('should allow an admin to edit another user comment', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Admin comment edit test',
          description: 'Testing admin comment permissions.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const commentResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Requester-created comment.',
          type: 'PUBLIC',
        })
        .expect(201);

      const response = await fixture.admin.agent
        .patch(
          `/api/v1/tickets/${ticketId}/comments/${commentResponse.body.id}`,
        )
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Admin-updated comment.',
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: commentResponse.body.id,
          body: 'Admin-updated comment.',
        }),
      );
    });

    it('should record comment creation and update in ticket activity', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Comment activity test',
          description: 'Testing comment activity history.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const commentResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Activity comment.',
          type: 'PUBLIC',
        })
        .expect(201);

      await fixture.requester.agent
        .patch(
          `/api/v1/tickets/${ticketId}/comments/${commentResponse.body.id}`,
        )
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Updated activity comment.',
        })
        .expect(200);

      const activityResponse = await fixture.requester.agent
        .get(`/api/v1/tickets/${ticketId}/activity`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(activityResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ticketId,
            type: 'COMMENT_ADDED',
          }),

          expect.objectContaining({
            ticketId,
            type: 'COMMENT_UPDATED',
          }),
        ]),
      );
    });

    describe('4-J --- Ticket History Refinement', () => {
      it('4-J.1 --- should expose derived activity categories', async () => {
        const ticketResponse = await fixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', fixture.organization.id)
          .send({
            title: '4-J.1 activity categorization',
            description: 'Verify derived activity categories.',
            priority: 'MEDIUM',
            type: 'INCIDENT',
          })
          .expect(201);

        const ticketId = ticketResponse.body.id;

        await fixture.admin.agent
          .patch(`/api/v1/tickets/${ticketId}/assignment`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            assigneeId: fixture.agent.userId,
          })
          .expect(200);

        await fixture.agent.agent
          .patch(`/api/v1/tickets/${ticketId}/status`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            status: 'IN_PROGRESS',
          })
          .expect(200);

        const activityResponse = await fixture.requester.agent
          .get(`/api/v1/tickets/${ticketId}/activity`)
          .set('x-organization-id', fixture.organization.id)
          .expect(200);

        expect(activityResponse.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ticketId,
              type: 'TICKET_CREATED',
              category: 'TICKET',
              actorId: fixture.requester.userId,
              actor: expect.objectContaining({
                id: fixture.requester.userId,
                name: expect.any(String),
                email: expect.any(String),
              }),
              actorPresentation: {
                userId: fixture.requester.userId,
                displayName: expect.any(String),
                email: expect.any(String),
              },
              createdAt: expect.any(String),
              timeline: expect.objectContaining({
                timestamp: expect.any(String),
                date: expect.any(String),
                time: expect.any(String),
              }),
            }),
          ]),
        );

        const statusActivity = activityResponse.body.find(
          (activity: { type: string; ticketId: string }) =>
            activity.ticketId === ticketId &&
            activity.type === 'STATUS_CHANGED',
        );

        expect(statusActivity).toEqual(
          expect.objectContaining({
            type: 'STATUS_CHANGED',
            category: 'WORKFLOW',
            actorId: fixture.agent.userId,
            actor: expect.objectContaining({
              id: fixture.agent.userId,
              name: expect.any(String),
              email: expect.any(String),
            }),
            actorPresentation: expect.objectContaining({
              userId: fixture.agent.userId,
              displayName: expect.any(String),
              email: expect.any(String),
            }),
            description: 'Status changed from OPEN to IN_PROGRESS',
          }),
        );

        const createdActivity = activityResponse.body.find(
          (activity: { ticketId: string; type: string }) =>
            activity.ticketId === ticketId &&
            activity.type === 'TICKET_CREATED',
        );

        expect(createdActivity).toBeDefined();

        expect(createdActivity.timeline.timestamp).toBe(
          createdActivity.createdAt,
        );

        expect(createdActivity.timeline.date).toBe(
          createdActivity.createdAt.slice(0, 10),
        );

        expect(createdActivity.timeline.time).toBe(
          createdActivity.createdAt.slice(11, 19),
        );
        // ============================================
        // 4-J.5 — History filtering
        // ============================================

        // Type filter
        const statusOnlyResponse = await fixture.requester.agent
          .get(`/api/v1/tickets/${ticketId}/activity`)
          .set('x-organization-id', fixture.organization.id)
          .query({
            type: 'STATUS_CHANGED',
          })
          .expect(200);

        expect(statusOnlyResponse.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ticketId,
              type: 'STATUS_CHANGED',
              category: 'WORKFLOW',
            }),
          ]),
        );

        expect(
          statusOnlyResponse.body.every(
            (activity: { type: string }) => activity.type === 'STATUS_CHANGED',
          ),
        ).toBe(true);

        // Category filter
        const workflowResponse = await fixture.requester.agent
          .get(`/api/v1/tickets/${ticketId}/activity`)
          .set('x-organization-id', fixture.organization.id)
          .query({
            category: 'WORKFLOW',
          })
          .expect(200);

        expect(workflowResponse.body.length).toBeGreaterThan(0);

        expect(
          workflowResponse.body.every(
            (activity: { category: string }) =>
              activity.category === 'WORKFLOW',
          ),
        ).toBe(true);

        // Actor filter
        const agentActivitiesResponse = await fixture.requester.agent
          .get(`/api/v1/tickets/${ticketId}/activity`)
          .set('x-organization-id', fixture.organization.id)
          .query({
            actorId: fixture.agent.userId,
          })
          .expect(200);

        expect(agentActivitiesResponse.body.length).toBeGreaterThan(0);

        expect(
          agentActivitiesResponse.body.every(
            (activity: { actorId: string }) =>
              activity.actorId === fixture.agent.userId,
          ),
        ).toBe(true);

        // Combined filter
        const combinedResponse = await fixture.requester.agent
          .get(`/api/v1/tickets/${ticketId}/activity`)
          .set('x-organization-id', fixture.organization.id)
          .query({
            type: 'STATUS_CHANGED',
            category: 'WORKFLOW',
            actorId: fixture.agent.userId,
          })
          .expect(200);

        expect(combinedResponse.body).toHaveLength(1);

        expect(combinedResponse.body[0]).toEqual(
          expect.objectContaining({
            ticketId,
            type: 'STATUS_CHANGED',
            category: 'WORKFLOW',
            actorId: fixture.agent.userId,
          }),
        );
      });
    });

    it('should reject an unsupported activity type filter', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '4-J.5 Invalid activity type',
          description: 'Invalid activity type filter test.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      await fixture.requester.agent
        .get(`/api/v1/tickets/${ticketResponse.body.id}/activity`)
        .set('x-organization-id', fixture.organization.id)
        .query({
          type: 'NOT_A_REAL_ACTIVITY_TYPE',
        })
        .expect(400);
    });

    it('should reject an unsupported activity category filter', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '4-J.5 Invalid activity category',
          description: 'Invalid activity category filter test.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      await fixture.requester.agent
        .get(`/api/v1/tickets/${ticketResponse.body.id}/activity`)
        .set('x-organization-id', fixture.organization.id)
        .query({
          category: 'NOT_A_REAL_CATEGORY',
        })
        .expect(400);
    });

    it('should delete a comment and record the deletion activity', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Comment deletion test',
          description: 'Testing comment deletion.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const commentResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Comment to delete.',
          type: 'PUBLIC',
        })
        .expect(201);

      const commentId = commentResponse.body.id;

      await fixture.requester.agent
        .delete(`/api/v1/tickets/${ticketId}/comments/${commentId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      const commentsResponse = await fixture.requester.agent
        .get(`/api/v1/tickets/${ticketId}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(
        commentsResponse.body.some(
          (comment: { id: string }) => comment.id === commentId,
        ),
      ).toBe(false);

      const activityResponse = await fixture.requester.agent
        .get(`/api/v1/tickets/${ticketId}/activity`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(activityResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ticketId,
            type: 'TICKET_CREATED',
            category: 'TICKET',
            description: `Ticket ${ticketResponse.body.ticketNumber} was created`,
            timeline: expect.objectContaining({
              timestamp: expect.any(String),
              date: expect.any(String),
              time: expect.any(String),
            }),
          }),
        ]),
      );
      expect(activityResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ticketId,

            type: 'COMMENT_DELETED',
          }),
        ]),
      );
    });

    it('should not allow comments from another organization to be accessed', async () => {
      const otherFixture = await createOrganizationTestFixture(app);

      try {
        const ticketResponse = await otherFixture.requester.agent
          .post('/api/v1/tickets')
          .set('x-organization-id', otherFixture.organization.id)
          .send({
            title: 'Other organization comment test',
            description: 'Cross-organization comment isolation.',
            priority: 'MEDIUM',
            type: 'INCIDENT',
          })
          .expect(201);

        const commentResponse = await otherFixture.requester.agent
          .post(`/api/v1/tickets/${ticketResponse.body.id}/comments`)
          .set('x-organization-id', otherFixture.organization.id)
          .send({
            body: 'Other organization comment.',
            type: 'PUBLIC',
          })
          .expect(201);

        await fixture.requester.agent
          .get(`/api/v1/tickets/${ticketResponse.body.id}/comments`)
          .set('x-organization-id', fixture.organization.id)
          .expect(404);

        await fixture.requester.agent
          .get(`/api/v1/tickets/${ticketResponse.body.id}/activity`)
          .set('x-organization-id', fixture.organization.id)
          .expect(404);

        await fixture.requester.agent
          .patch(
            `/api/v1/tickets/${ticketResponse.body.id}/comments/${commentResponse.body.id}`,
          )
          .set('x-organization-id', fixture.organization.id)
          .send({
            body: 'Cross-org modification attempt.',
          })
          .expect(404);
      } finally {
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

  describe('Attachments', () => {
    it('should upload and list an attachment for a ticket', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Attachment upload test',
          description: 'Testing ticket attachments.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const fileContent = Buffer.from('TechTicket attachment test');

      const uploadResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/attachments`)
        .set('x-organization-id', fixture.organization.id)
        .attach('file', fileContent, {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      expect(uploadResponse.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          ticketId,
          uploadedById: fixture.requester.userId,
          fileName: 'test.txt',
          mimeType: 'text/plain',
          size: fileContent.length,
          createdAt: expect.any(String),
        }),
      );

      const attachmentId = uploadResponse.body.id;

      const listResponse = await fixture.requester.agent
        .get(`/api/v1/tickets/${ticketId}/attachments`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(listResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: attachmentId,
            ticketId,
            uploadedById: fixture.requester.userId,
            fileName: 'test.txt',
            mimeType: 'text/plain',
            size: fileContent.length,
          }),
        ]),
      );
    });

    it('should download an uploaded attachment with the original content and metadata', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Attachment download test',
          description: 'Testing attachment download.',
          priority: 'LOW',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const fileContent = Buffer.from('Download this attachment');

      const uploadResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/attachments`)
        .set('x-organization-id', fixture.organization.id)
        .attach('file', fileContent, {
          filename: 'download-test.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      const attachmentId = uploadResponse.body.id;

      const response = await fixture.requester.agent
        .get(`/api/v1/tickets/${ticketId}/attachments/${attachmentId}`)
        .set('x-organization-id', fixture.organization.id)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];

          res.on('data', (chunk: Buffer) => {
            chunks.push(Buffer.from(chunk));
          });

          res.on('end', () => {
            callback(null, Buffer.concat(chunks));
          });
        })
        .expect(200);

      expect(Buffer.isBuffer(response.body)).toBe(true);

      expect(response.body.toString()).toBe(fileContent.toString());

      expect(response.headers['content-type']).toContain('text/plain');

      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should reject an unsupported attachment MIME type', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Invalid attachment test',
          description: 'Testing unsupported attachment types.',
          priority: 'LOW',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/attachments`)
        .set('x-organization-id', fixture.organization.id)
        .attach('file', Buffer.from('<script>alert("test")</script>'), {
          filename: 'malicious.html',
          contentType: 'text/html',
        })
        .expect(400);
    });

    it('should reject an attachment larger than 10 MB', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Large attachment test',
          description: 'Testing attachment size limits.',
          priority: 'LOW',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const oversizedFile = Buffer.alloc(10 * 1024 * 1024 + 1, 'a');

      await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/attachments`)
        .set('x-organization-id', fixture.organization.id)
        .attach('file', oversizedFile, {
          filename: 'oversized.txt',
          contentType: 'text/plain',
        })
        .expect(413);
    });

    it('should not allow attachment access from another organization', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Organization attachment isolation',
          description: 'Testing attachment organization isolation.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const fileContent = Buffer.from('Organization scoped attachment');

      const uploadResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/attachments`)
        .set('x-organization-id', fixture.organization.id)
        .attach('file', fileContent, {
          filename: 'organization.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      const attachmentId = uploadResponse.body.id;

      const otherOrganization = await createOrganizationTestFixture(app);

      try {
        await otherOrganization.requester.agent
          .get(`/api/v1/tickets/${ticketId}/attachments`)
          .set('x-organization-id', otherOrganization.organization.id)
          .expect(404);

        await otherOrganization.requester.agent
          .get(`/api/v1/tickets/${ticketId}/attachments/${attachmentId}`)
          .set('x-organization-id', otherOrganization.organization.id)
          .expect(404);

        await otherOrganization.requester.agent
          .delete(`/api/v1/tickets/${ticketId}/attachments/${attachmentId}`)
          .set('x-organization-id', otherOrganization.organization.id)
          .expect(403);
      } finally {
        await database.organization.delete({
          where: {
            id: otherOrganization.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                otherOrganization.owner.userId,
                otherOrganization.admin.userId,
                otherOrganization.agent.userId,
                otherOrganization.requester.userId,
              ],
            },
          },
        });
      }
    });

    it('should not allow a REQUESTER to delete an attachment', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Attachment authorization test',
          description: 'Testing attachment deletion authorization.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const uploadResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/attachments`)
        .set('x-organization-id', fixture.organization.id)
        .attach('file', Buffer.from('Protected attachment'), {
          filename: 'protected.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      const attachmentId = uploadResponse.body.id;

      await fixture.requester.agent
        .delete(`/api/v1/tickets/${ticketId}/attachments/${attachmentId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(403);

      await fixture.requester.agent
        .get(`/api/v1/tickets/${ticketId}/attachments/${attachmentId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);
    });

    it('should allow an authorized AGENT to delete an attachment', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Attachment deletion test',
          description: 'Testing authorized attachment deletion.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const uploadResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketId}/attachments`)
        .set('x-organization-id', fixture.organization.id)
        .attach('file', Buffer.from('Attachment to delete'), {
          filename: 'delete-me.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      const attachmentId = uploadResponse.body.id;

      const deleteResponse = await fixture.agent.agent
        .delete(`/api/v1/tickets/${ticketId}/attachments/${attachmentId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(deleteResponse.body).toEqual({
        id: attachmentId,
        deleted: true,
      });

      await fixture.agent.agent
        .get(`/api/v1/tickets/${ticketId}/attachments/${attachmentId}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(404);

      const listResponse = await fixture.agent.agent
        .get(`/api/v1/tickets/${ticketId}/attachments`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(listResponse.body).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: attachmentId,
          }),
        ]),
      );
    });
  });

  describe('Approvals', () => {
    it('should create a pending approval for an authorized member', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Production database change',
          description: 'Approval required before applying the database change.',
          priority: 'HIGH',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const response = await fixture.admin.agent
        .post(`/api/v1/tickets/${ticketId}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.owner.userId,
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          ticketId,
          approverId: fixture.owner.userId,
          status: 'PENDING',
        }),
      );

      expect(response.body.requestedAt).toBeDefined();
    });

    it('should list approvals for a ticket', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Approval list test',
          description: 'Testing approval listing.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const createResponse = await fixture.admin.agent
        .post(`/api/v1/tickets/${ticketId}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.agent.userId,
        })
        .expect(201);

      const response = await fixture.admin.agent
        .get(`/api/v1/tickets/${ticketId}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createResponse.body.id,
            ticketId,
            approverId: fixture.agent.userId,
            status: 'PENDING',
          }),
        ]),
      );
    });

    it('should allow the designated approver to approve a pending approval', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Approval success test',
          description: 'Testing approval.',
          priority: 'HIGH',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const approvalResponse = await fixture.admin.agent
        .post(`/api/v1/tickets/${ticketId}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.agent.userId,
        })
        .expect(201);

      const approvalId = approvalResponse.body.id;

      const response = await fixture.agent.agent
        .patch(`/api/v1/tickets/${ticketId}/approvals/${approvalId}/approve`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          comment: 'Approved for implementation.',
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: approvalId,
          ticketId,
          approverId: fixture.agent.userId,
          status: 'APPROVED',
          comment: 'Approved for implementation.',
        }),
      );

      expect(response.body.approvedAt).toBeDefined();
    });

    it('should allow the designated approver to reject a pending approval', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Approval rejection test',
          description: 'Testing approval rejection.',
          priority: 'HIGH',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const approvalResponse = await fixture.admin.agent
        .post(`/api/v1/tickets/${ticketId}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.agent.userId,
        })
        .expect(201);

      const approvalId = approvalResponse.body.id;

      const response = await fixture.agent.agent
        .patch(`/api/v1/tickets/${ticketId}/approvals/${approvalId}/reject`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          comment: 'The requested change needs additional review.',
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: approvalId,
          ticketId,
          approverId: fixture.agent.userId,
          status: 'REJECTED',
          comment: 'The requested change needs additional review.',
        }),
      );

      expect(response.body.rejectedAt).toBeDefined();
    });

    it('should allow an authorized member to cancel a pending approval', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Approval cancellation test',
          description: 'Testing approval cancellation.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const approvalResponse = await fixture.admin.agent
        .post(`/api/v1/tickets/${ticketId}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.agent.userId,
        })
        .expect(201);

      const approvalId = approvalResponse.body.id;

      const response = await fixture.admin.agent
        .patch(`/api/v1/tickets/${ticketId}/approvals/${approvalId}/cancel`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: approvalId,
          ticketId,
          approverId: fixture.agent.userId,
          status: 'CANCELLED',
        }),
      );
    });

    it('should reject approval creation by a REQUESTER', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Requester approval test',
          description: 'Requester should not create approvals.',
          priority: 'LOW',
          type: 'INCIDENT',
        })
        .expect(201);

      await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketResponse.body.id}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.agent.userId,
        })
        .expect(403);
    });

    it('should reject assigning a REQUESTER as an approver', async () => {
      const ticketResponse = await fixture.admin.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Invalid approver role',
          description: 'Requester cannot be an approver.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      await fixture.admin.agent
        .post(`/api/v1/tickets/${ticketResponse.body.id}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.requester.userId,
        })
        .expect(400);
    });

    it('should reject an approver from another organization', async () => {
      const ticketResponse = await fixture.admin.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Cross organization approver',
          description: 'Approver must belong to the same organization.',
          priority: 'HIGH',
          type: 'INCIDENT',
        })
        .expect(201);

      const otherOrganization = await createOrganizationTestFixture(app);

      try {
        await fixture.admin.agent
          .post(`/api/v1/tickets/${ticketResponse.body.id}/approvals`)
          .set('x-organization-id', fixture.organization.id)
          .send({
            approverId: otherOrganization.agent.userId,
          })
          .expect(400);
      } finally {
        await database.organization.delete({
          where: {
            id: otherOrganization.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                otherOrganization.owner.userId,
                otherOrganization.admin.userId,
                otherOrganization.agent.userId,
                otherOrganization.requester.userId,
              ],
            },
          },
        });
      }
    });

    it('should reject approval action by a different organization member', async () => {
      const ticketResponse = await fixture.admin.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Wrong approver test',
          description: 'Only the designated approver can approve.',
          priority: 'HIGH',
          type: 'INCIDENT',
        })
        .expect(201);

      const approvalResponse = await fixture.admin.agent
        .post(`/api/v1/tickets/${ticketResponse.body.id}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.agent.userId,
        })
        .expect(201);

      await fixture.admin.agent
        .patch(
          `/api/v1/tickets/${ticketResponse.body.id}/approvals/${approvalResponse.body.id}/approve`,
        )
        .set('x-organization-id', fixture.organization.id)
        .send({
          comment: 'Admin is not the designated approver.',
        })
        .expect(403);
    });

    it('should reject approving an already approved approval', async () => {
      const ticketResponse = await fixture.admin.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Duplicate approval test',
          description: 'Approval cannot be completed twice.',
          priority: 'HIGH',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const approvalResponse = await fixture.admin.agent
        .post(`/api/v1/tickets/${ticketId}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.agent.userId,
        })
        .expect(201);

      const approvalId = approvalResponse.body.id;

      await fixture.agent.agent
        .patch(`/api/v1/tickets/${ticketId}/approvals/${approvalId}/approve`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      await fixture.agent.agent
        .patch(`/api/v1/tickets/${ticketId}/approvals/${approvalId}/approve`)
        .set('x-organization-id', fixture.organization.id)
        .expect(400);
    });

    it('should reject rejecting an already cancelled approval', async () => {
      const ticketResponse = await fixture.admin.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Cancelled approval test',
          description: 'Cancelled approvals cannot be rejected.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const approvalResponse = await fixture.admin.agent
        .post(`/api/v1/tickets/${ticketId}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.agent.userId,
        })
        .expect(201);

      const approvalId = approvalResponse.body.id;

      await fixture.admin.agent
        .patch(`/api/v1/tickets/${ticketId}/approvals/${approvalId}/cancel`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      await fixture.agent.agent
        .patch(`/api/v1/tickets/${ticketId}/approvals/${approvalId}/reject`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          comment: 'This should fail.',
        })
        .expect(400);
    });

    it('should not allow approval access from another organization', async () => {
      const ticketResponse = await fixture.admin.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Cross organization approval access',
          description: 'Approval must remain organization isolated.',
          priority: 'HIGH',
          type: 'INCIDENT',
        })
        .expect(201);

      const ticketId = ticketResponse.body.id;

      const approvalResponse = await fixture.admin.agent

        .post(`/api/v1/tickets/${ticketId}/approvals`)

        .set('x-organization-id', fixture.organization.id)

        .send({
          approverId: fixture.agent.userId,
        })

        .expect(201);

      const otherOrganization = await createOrganizationTestFixture(app);

      try {
        await otherOrganization.admin.agent

          .get(`/api/v1/tickets/${ticketId}/approvals`)

          .set('x-organization-id', otherOrganization.organization.id)

          .expect(404);

        await otherOrganization.admin.agent

          .patch(
            `/api/v1/tickets/${ticketId}/approvals/${approvalResponse.body.id}/approve`,
          )

          .set('x-organization-id', otherOrganization.organization.id)

          .expect(404);
      } finally {
        await database.organization.delete({
          where: {
            id: otherOrganization.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                otherOrganization.owner.userId,

                otherOrganization.admin.userId,

                otherOrganization.agent.userId,

                otherOrganization.requester.userId,
              ],
            },
          },
        });
      }
    });

    it('should record approval lifecycle events in ticket activity', async () => {
      const ticketResponse = await fixture.admin.agent

        .post('/api/v1/tickets')

        .set('x-organization-id', fixture.organization.id)

        .send({
          title: 'Approval activity test',

          description: 'Approval actions should generate activity.',

          priority: 'HIGH',

          type: 'INCIDENT',
        })

        .expect(201);

      const ticketId = ticketResponse.body.id;

      const approvalResponse = await fixture.admin.agent

        .post(`/api/v1/tickets/${ticketId}/approvals`)

        .set('x-organization-id', fixture.organization.id)

        .send({
          approverId: fixture.agent.userId,
        })

        .expect(201);

      await fixture.agent.agent

        .patch(
          `/api/v1/tickets/${ticketId}/approvals/${approvalResponse.body.id}/approve`,
        )

        .set('x-organization-id', fixture.organization.id)

        .send({
          comment: 'Approved.',
        })

        .expect(200);

      const activityResponse = await fixture.admin.agent
        .get(`/api/v1/tickets/${ticketId}/activity`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(activityResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'APPROVAL_REQUESTED',
          }),

          expect.objectContaining({
            type: 'APPROVAL_APPROVED',
          }),
        ]),
      );
    });
  });

  describe('4-G.6.11 Validation/error paths', () => {
    it('should reject a ticket with a blank title', async () => {
      const response = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '   ',
          description: 'A valid description.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Ticket title is required',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should reject a ticket with a blank description', async () => {
      const response = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Validation test ticket',
          description: '   ',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Ticket description is required',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should reject assigneeId combined with unassigned', async () => {
      const response = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          assigneeId: fixture.agent.userId,
          unassigned: true,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'assigneeId cannot be used with unassigned',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should reject teamId combined with unassignedTeam', async () => {
      const response = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          teamId: randomUUID(),
          unassignedTeam: true,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'teamId cannot be used with unassignedTeam',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should reject an inverted created-date range', async () => {
      const response = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          createdFrom: '2026-09-10',
          createdTo: '2026-09-09',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'createdFrom cannot be later than createdTo',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should reject an inverted updated-date range', async () => {
      const response = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          updatedFrom: '2026-09-10',
          updatedTo: '2026-09-09',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'updatedFrom cannot be later than updatedTo',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should reject a comment with an empty body', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Empty comment validation ticket',
          description: 'Ticket used to verify empty comment validation.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const response = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketResponse.body.id}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: '   ',
          type: 'PUBLIC',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Comment body cannot be empty',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('should reject updating a comment with an empty body', async () => {
      const ticketResponse = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: 'Empty comment update validation ticket',
          description: 'Ticket used to verify empty comment update validation.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const commentResponse = await fixture.requester.agent
        .post(`/api/v1/tickets/${ticketResponse.body.id}/comments`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: 'Original comment body.',
          type: 'PUBLIC',
        })
        .expect(201);

      const response = await fixture.requester.agent
        .patch(
          `/api/v1/tickets/${ticketResponse.body.id}/comments/${commentResponse.body.id}`,
        )
        .set('x-organization-id', fixture.organization.id)
        .send({
          body: '   ',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Comment body cannot be empty',
        error: 'Bad Request',
        statusCode: 400,
      });
    });
  });

  describe('Organization + authorization isolation', () => {
    it('should not allow a user to access a ticket from another organization', async () => {
      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        const createResponse = await fixture.requester.agent

          .post('/api/v1/tickets')

          .set('x-organization-id', fixture.organization.id)

          .send({
            title: 'Organization A private ticket',

            description: 'This ticket must not be visible to Organization B.',

            priority: 'HIGH',

            type: 'INCIDENT',
          })

          .expect(201);

        const ticketId = createResponse.body.id;

        await foreignFixture.requester.agent

          .get(`/api/v1/tickets/${ticketId}`)

          .set('x-organization-id', foreignFixture.organization.id)

          .expect(404);
      } finally {
        await database.organization.delete({
          where: {
            id: foreignFixture.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                foreignFixture.owner.userId,

                foreignFixture.admin.userId,

                foreignFixture.agent.userId,

                foreignFixture.requester.userId,
              ],
            },
          },
        });
      }
    });

    it('should not expose tickets from another organization through the ticket list', async () => {
      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        const ownTicket = await fixture.requester.agent

          .post('/api/v1/tickets')

          .set('x-organization-id', fixture.organization.id)

          .send({
            title: 'Current organization ticket',

            description: 'Visible only to the current organization.',

            priority: 'MEDIUM',

            type: 'INCIDENT',
          })

          .expect(201);

        const foreignTicket = await foreignFixture.requester.agent

          .post('/api/v1/tickets')

          .set('x-organization-id', foreignFixture.organization.id)

          .send({
            title: 'Foreign organization ticket',

            description: 'Must never appear in the other organization list.',

            priority: 'HIGH',

            type: 'INCIDENT',
          })

          .expect(201);

        const response = await fixture.requester.agent

          .get('/api/v1/tickets')

          .set('x-organization-id', fixture.organization.id)

          .expect(200);

        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: ownTicket.body.id,

              organizationId: fixture.organization.id,
            }),
          ]),
        );

        expect(response.body.data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: foreignTicket.body.id,

              organizationId: foreignFixture.organization.id,
            }),
          ]),
        );

        expect(
          response.body.data.every(
            (ticket: { organizationId: string }) =>
              ticket.organizationId === fixture.organization.id,
          ),
        ).toBe(true);
      } finally {
        await database.organization.delete({
          where: {
            id: foreignFixture.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                foreignFixture.owner.userId,

                foreignFixture.admin.userId,

                foreignFixture.agent.userId,

                foreignFixture.requester.userId,
              ],
            },
          },
        });
      }
    });

    it('should reject an authenticated user who is not a member of the requested organization', async () => {
      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        await fixture.requester.agent

          .get('/api/v1/tickets')

          .set('x-organization-id', foreignFixture.organization.id)

          .expect(403);
      } finally {
        await database.organization.delete({
          where: {
            id: foreignFixture.organization.id,
          },
        });

        await database.user.deleteMany({
          where: {
            id: {
              in: [
                foreignFixture.owner.userId,

                foreignFixture.admin.userId,

                foreignFixture.agent.userId,

                foreignFixture.requester.userId,
              ],
            },
          },
        });
      }
    });
  });
});
