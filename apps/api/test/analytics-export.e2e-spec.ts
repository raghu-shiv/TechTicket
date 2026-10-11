import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { createTestApp } from './helpers/app.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

interface ExportedUsageReport {
  summary: {
    ticketsCreated: number;
    activitiesRecorded: number;
    commentsCreated: number;
    attachmentsUploaded: number;
    approvalRequests: number;
    approvalsApproved: number;
    approvalsRejected: number;
    activeUsers: number;
    activeAgents: number;
  };
}

describe('Analytics exports API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;
  let foreignFixture: OrganizationTestFixture;

  const createdTicketIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    database = app.get(DatabaseService);

    fixture = await createOrganizationTestFixture(app);
    foreignFixture = await createOrganizationTestFixture(app);
  });

  afterEach(async () => {
    if (createdTicketIds.length > 0) {
      await database.ticket.deleteMany({
        where: { id: { in: [...createdTicketIds] } },
      });

      createdTicketIds.length = 0;
    }
  });

  afterAll(async () => {
    for (const current of [fixture, foreignFixture]) {
      if (!current) continue;

      await database.organization.deleteMany({
        where: { id: current.organization.id },
      });

      await database.user.deleteMany({
        where: {
          id: {
            in: [
              current.owner.userId,
              current.admin.userId,
              current.agent.userId,
              current.requester.userId,
            ],
          },
        },
      });
    }

    await app?.close();
  });

  function exportRequest(report: string, query: Record<string, string> = {}) {
    return fixture.owner.agent
      .get(`/api/v1/reports/analytics/export/${report}`)
      .set('x-organization-id', fixture.organization.id)
      .query(query);
  }

  function usageRequest(query: Record<string, string> = {}) {
    return fixture.owner.agent
      .get('/api/v1/reports/analytics/usage')
      .set('x-organization-id', fixture.organization.id)
      .query(query);
  }

  it('exports CSV with the stable column contract and download headers', async () => {
    const response = await exportRequest('usage', {
      format: 'csv',
      from: '2020-01-01T00:00:00.000Z',
      to: '2020-01-07T23:59:59.999Z',
    }).expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="techticket-usage-',
    );
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.text).toContain('section,recordIndex,field,value');
    expect(response.text).toContain('summary');
  });

  it('exports JSON identical to the existing report response', async () => {
    const query = {
      from: '2020-01-01T00:00:00.000Z',
      to: '2020-01-07T23:59:59.999Z',
    };

    const [screenResponse, exportResponse] = await Promise.all([
      usageRequest(query).expect(200),
      exportRequest('usage', {
        ...query,
        format: 'json',
      }).expect(200),
    ]);

    const exported =
      typeof exportResponse.body === 'object' &&
      Object.keys(exportResponse.body).length > 0
        ? exportResponse.body
        : JSON.parse(exportResponse.text);

    expect(exportResponse.headers['content-type']).toContain(
      'application/json',
    );
    expect(exportResponse.headers['content-disposition']).toContain('.json"');
    expect(exported).toEqual(screenResponse.body);
  });

  it('rejects an unknown report or export format', async () => {
    await exportRequest('unknown-report', {
      format: 'csv',
    }).expect(400);

    await exportRequest('usage', {
      format: 'xlsx',
    }).expect(400);
  });

  it('requires organization context and authentication', async () => {
    // The fixture agent is authenticated, but this request deliberately
    // omits the required active-organization header.
    await fixture.owner.agent
      .get('/api/v1/reports/analytics/export/usage')
      .expect(401);
  });

  it('does not include another organization’s tickets in an export', async () => {
    const createdAt = new Date('2040-01-02T12:00:00.000Z');

    const foreignTicket = await database.ticket.create({
      data: {
        organizationId: foreignFixture.organization.id,
        requesterId: foreignFixture.requester.userId,
        ticketNumber: `EXPORT-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: 'Foreign organization export isolation test',
        description: 'Must not appear in another organization export',
        status: 'OPEN',
        priority: 'MEDIUM',
        type: 'INCIDENT',
        createdAt,
        updatedAt: createdAt,
      },
    });

    createdTicketIds.push(foreignTicket.id);

    const response = await exportRequest('usage', {
      format: 'json',
      from: '2040-01-02T00:00:00.000Z',
      to: '2040-01-02T23:59:59.999Z',
    }).expect(200);

    const exported =
      typeof response.body === 'object' && Object.keys(response.body).length > 0
        ? (response.body as ExportedUsageReport)
        : (JSON.parse(response.text) as ExportedUsageReport);

    expect(exported.summary.ticketsCreated).toBe(0);
  });

  it('preserves date validation in the underlying report service', async () => {
    await exportRequest('usage', {
      format: 'json',
      from: '2026-10-10T00:00:00.000Z',
      to: '2026-10-01T00:00:00.000Z',
    }).expect(400);
  });
});
