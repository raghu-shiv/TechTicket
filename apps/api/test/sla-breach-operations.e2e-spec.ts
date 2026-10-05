import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

describe('SLA Breach Operations API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;
  let slaPolicyId: string;

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);

    fixture = await createOrganizationTestFixture(app);

    /*
     * SLA-managed ticket prerequisite.
     *
     * Ticket creation only creates a TicketSla snapshot when the
     * organization has an active SLA policy with a target for the
     * ticket's priority.
     *
     * Keep this policy active for the entire E2E suite so the tests
     * exercise the real Ticket -> active policy -> TicketSla flow.
     */
    const slaPolicy = await database.slaPolicy.create({
      data: {
        organizationId: fixture.organization.id,
        name: '6-D E2E SLA Policy',
        isActive: true,
        targets: {
          create: [
            {
              priority: 'LOW',
              firstResponseMinutes: 60,
              resolutionMinutes: 240,
            },
            {
              priority: 'MEDIUM',
              firstResponseMinutes: 30,
              resolutionMinutes: 120,
            },
            {
              priority: 'HIGH',
              firstResponseMinutes: 15,
              resolutionMinutes: 60,
            },
            {
              priority: 'URGENT',
              firstResponseMinutes: 5,
              resolutionMinutes: 30,
            },
          ],
        },
      },
    });
    slaPolicyId = slaPolicy.id;
  });

  afterAll(async () => {
    if (fixture) {
      if (slaPolicyId) {
        await database.slaPolicy.delete({
          where: {
            id: slaPolicyId,
          },
        });
      }

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

  describe('GET /api/v1/tickets?slaBreached=true', () => {
    it('returns only tickets with a persisted SLA breach', async () => {
      const normalTicket = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '6-D Normal SLA Ticket',
          description: 'Ticket without an SLA breach.',
          priority: 'MEDIUM',
          type: 'INCIDENT',
        })
        .expect(201);

      const breachedTicket = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '6-D Breached SLA Ticket',
          description: 'Ticket with a persisted SLA breach.',
          priority: 'HIGH',
          type: 'INCIDENT',
        })
        .expect(201);

      /*
       * The active SLA policy created in beforeAll() causes ticket
       * creation to persist a TicketSla snapshot automatically.
       *
       * Mark only the first-response SLA as breached so this test
       * verifies the persisted breach filter without invoking the
       * background breach monitor.
       */
      await database.ticketSla.update({
        where: {
          ticketId: breachedTicket.body.id,
        },
        data: {
          firstResponseBreachedAt: new Date(),
        },
      });

      const response = await fixture.requester.agent
        .get('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .query({
          slaBreached: true,
        })
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: breachedTicket.body.id,
            sla: expect.objectContaining({
              firstResponseBreachedAt: expect.any(String),
            }),
          }),
        ]),
      );

      expect(response.body.data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: normalTicket.body.id,
          }),
        ]),
      );

      expect(
        response.body.data.every(
          (ticket: {
            sla: {
              firstResponseBreachedAt: string | null;
              resolutionBreachedAt: string | null;
            } | null;
          }) =>
            ticket.sla !== null &&
            (ticket.sla.firstResponseBreachedAt !== null ||
              ticket.sla.resolutionBreachedAt !== null),
        ),
      ).toBe(true);
    });
  });

  describe('Ticket SLA escalation exposure', () => {
    it('exposes existing escalation records without creating duplicates', async () => {
      const ticket = await fixture.requester.agent
        .post('/api/v1/tickets')
        .set('x-organization-id', fixture.organization.id)
        .send({
          title: '6-D Escalation Exposure',
          description: 'Ticket used to verify escalation exposure.',
          priority: 'URGENT',
          type: 'INCIDENT',
        })
        .expect(201);

      /*
       * Ticket creation must have created the SLA snapshot from the
       * active E2E SLA policy.
       */
      const ticketSla = await database.ticketSla.findUnique({
        where: {
          ticketId: ticket.body.id,
        },
      });

      expect(ticketSla).not.toBeNull();

      if (!ticketSla) {
        throw new Error('Ticket SLA was not created');
      }

      /*
       * Seed an existing escalation directly.
       *
       * The purpose of this test is to verify that the operational
       * API exposes existing escalation records without creating
       * another record.
       */
      const escalation = await database.slaEscalation.create({
        data: {
          ticketId: ticket.body.id,
          ticketSlaId: ticketSla.id,
          type: 'FIRST_RESPONSE_BREACH',
        },
      });

      const response = await fixture.requester.agent
        .get(`/api/v1/tickets/${ticket.body.id}`)
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      expect(response.body.sla.slaEscalations).toEqual([
        expect.objectContaining({
          id: escalation.id,
          type: 'FIRST_RESPONSE_BREACH',
          createdAt: expect.any(String),
        }),
      ]);

      /*
       * The database-level unique constraint on
       * (ticketSlaId, type) must continue to prevent duplicate
       * escalation records.
       */
      const duplicateAttempt = await database.slaEscalation
        .create({
          data: {
            ticketId: ticket.body.id,
            ticketSlaId: ticketSla.id,
            type: 'FIRST_RESPONSE_BREACH',
          },
        })
        .catch((error: unknown) => error);

      expect(duplicateAttempt).toBeInstanceOf(Error);

      const escalationCount = await database.slaEscalation.count({
        where: {
          ticketSlaId: ticketSla.id,
          type: 'FIRST_RESPONSE_BREACH',
        },
      });

      expect(escalationCount).toBe(1);
    });
  });
});
