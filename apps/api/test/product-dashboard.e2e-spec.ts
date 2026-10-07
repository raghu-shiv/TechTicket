import type { INestApplication } from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';

import { createTestApp } from './helpers/app.helper.js';

import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

interface ProductAnalyticsResponse {
  data: {
    summary: {
      totalTickets: number;
      activeTickets: number;
      resolvedClosedTickets: number;
      productsWithTickets: number;
      slaTracked: number;
      slaBreached: number;
      slaComplianceRate: number | null;
      averageResolutionMinutes: number | null;
      medianResolutionMinutes: number | null;
    };

    products: Array<{
      id: string;
      name: string;
      isActive: boolean;
      ticketVolume: number;
      activeTickets: number;
      resolvedClosedTickets: number;

      priorityDistribution: Array<{
        key: string;
        label: string;
        count: number;
        percentage: number;
      }>;

      sla: {
        tracked: number;
        breached: number;
        compliant: number;
        complianceRate: number | null;
      };

      tat: {
        resolved: number;
        averageResolutionMinutes: number | null;
        medianResolutionMinutes: number | null;
      };

      trend: Array<{
        date: string;
        count: number;
      }>;
    }>;
  };

  meta: {
    query: {
      dateField: 'createdAt' | 'updatedAt';
      dateFrom: string | null;
      dateTo: string | null;
      productId: string | null;
      organizationScoped: true;
      queryVersion: 1;
    };
  };
}

describe('Product Dashboard API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let fixture: OrganizationTestFixture;

  const createdTicketIds: string[] = [];
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);

    fixture = await createOrganizationTestFixture(app);
  });

  afterEach(async () => {
    if (createdTicketIds.length > 0) {
      await database.ticket.deleteMany({
        where: {
          id: {
            in: createdTicketIds,
          },
        },
      });

      createdTicketIds.length = 0;
    }

    if (createdProductIds.length > 0) {
      await database.product.deleteMany({
        where: {
          id: {
            in: createdProductIds,
          },
        },
      });

      createdProductIds.length = 0;
    }
  });

  afterAll(async () => {
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

  function dashboardRequest() {
    return fixture.owner.agent
      .get('/api/v1/reports/analytics/products')
      .set('x-organization-id', fixture.organization.id);
  }

  async function createProduct(
    name = `Product ${randomUUID()}`,
    isActive = true,
  ) {
    const product = await database.product.create({
      data: {
        organizationId: fixture.organization.id,
        name,
        isActive,
      },
    });

    createdProductIds.push(product.id);

    return product;
  }

  async function createTicket(input: {
    title: string;
    productId?: string | null;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status?: 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';
    createdAt?: Date;
    updatedAt?: Date;
    resolvedAt?: Date | null;
  }) {
    const ticket = await database.ticket.create({
      data: {
        organizationId: fixture.organization.id,
        requesterId: fixture.requester.userId,
        ticketNumber: `PD-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: input.title,
        description: input.title,
        productId: input.productId ?? null,
        priority: input.priority ?? 'MEDIUM',
        status: input.status ?? 'OPEN',
        type: 'INCIDENT',
        createdAt: input.createdAt ?? new Date(),
        updatedAt: input.updatedAt ?? new Date(),
        resolvedAt: input.resolvedAt ?? null,
      },
    });

    createdTicketIds.push(ticket.id);

    return ticket;
  }

  it('should return the Product Dashboard contract', async () => {
    const product = await createProduct('Analytics Product');

    await createTicket({
      title: 'Product ticket',
      productId: product.id,
    });

    const response = await dashboardRequest().expect(200);

    const body = response.body as ProductAnalyticsResponse;

    expect(body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          summary: expect.any(Object),
          products: expect.any(Array),
        }),
        meta: expect.objectContaining({
          query: expect.objectContaining({
            organizationScoped: true,
            queryVersion: 1,
            productId: null,
          }),
        }),
      }),
    );
  });

  it('should aggregate ticket volume by product', async () => {
    const productA = await createProduct('Product A');
    const productB = await createProduct('Product B');

    await createTicket({
      title: 'A1',
      productId: productA.id,
    });

    await createTicket({
      title: 'A2',
      productId: productA.id,
    });

    await createTicket({
      title: 'B1',
      productId: productB.id,
    });

    const response = await dashboardRequest().expect(200);

    const body = response.body as ProductAnalyticsResponse;

    const a = body.data.products.find((item) => item.id === productA.id);
    const b = body.data.products.find((item) => item.id === productB.id);

    expect(a?.ticketVolume).toBe(2);
    expect(b?.ticketVolume).toBe(1);
  });

  it('should separate active and resolved/closed tickets', async () => {
    const product = await createProduct('Lifecycle Product');

    await createTicket({
      title: 'Open ticket',
      productId: product.id,
      status: 'OPEN',
    });

    await createTicket({
      title: 'Resolved ticket',
      productId: product.id,
      status: 'RESOLVED',
      resolvedAt: new Date(),
    });

    const response = await dashboardRequest().expect(200);

    const body = response.body as ProductAnalyticsResponse;

    const item = body.data.products.find((row) => row.id === product.id);

    expect(item?.ticketVolume).toBe(2);
    expect(item?.activeTickets).toBe(1);
    expect(item?.resolvedClosedTickets).toBe(1);
  });

  it('should calculate priority distribution per product', async () => {
    const product = await createProduct('Priority Product');

    await createTicket({
      title: 'High one',
      productId: product.id,
      priority: 'HIGH',
    });

    await createTicket({
      title: 'High two',
      productId: product.id,
      priority: 'HIGH',
    });

    await createTicket({
      title: 'Low one',
      productId: product.id,
      priority: 'LOW',
    });

    const response = await dashboardRequest().expect(200);

    const body = response.body as ProductAnalyticsResponse;

    const item = body.data.products.find((row) => row.id === product.id);

    expect(item?.priorityDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'HIGH',
          count: 2,
        }),
        expect.objectContaining({
          key: 'LOW',
          count: 1,
        }),
      ]),
    );

    const total = item?.priorityDistribution.reduce(
      (sum, point) => sum + point.count,
      0,
    );

    expect(total).toBe(3);
  });

  it('should calculate TAT metrics per product', async () => {
    const product = await createProduct('TAT Product');

    const now = new Date();

    await createTicket({
      title: 'One hour',
      productId: product.id,
      status: 'RESOLVED',
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 30 * 60 * 1000),
    });

    await createTicket({
      title: 'Two hours',
      productId: product.id,
      status: 'RESOLVED',
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 60 * 60 * 1000),
    });

    const response = await dashboardRequest().expect(200);

    const body = response.body as ProductAnalyticsResponse;

    const item = body.data.products.find((row) => row.id === product.id);

    expect(item?.tat.resolved).toBe(2);
    expect(item?.tat.averageResolutionMinutes).toBeCloseTo(75, 0);
    expect(item?.tat.medianResolutionMinutes).toBeCloseTo(75, 0);
  });

  it('should exclude unclassified tickets from product metrics', async () => {
    const product = await createProduct('Classified Product');

    await createTicket({
      title: 'Product ticket',
      productId: product.id,
    });

    await createTicket({
      title: 'Unclassified ticket',
      productId: null,
    });

    const response = await dashboardRequest().expect(200);

    const body = response.body as ProductAnalyticsResponse;

    const item = body.data.products.find((row) => row.id === product.id);

    expect(item?.ticketVolume).toBe(1);
    expect(body.data.summary.totalTickets).toBe(2);
  });

  it('should include inactive products for historical reporting', async () => {
    const product = await createProduct('Inactive Historical Product', false);

    await createTicket({
      title: 'Historical inactive product ticket',
      productId: product.id,
    });

    const response = await dashboardRequest().expect(200);

    const body = response.body as ProductAnalyticsResponse;

    const item = body.data.products.find((row) => row.id === product.id);

    expect(item).toEqual(
      expect.objectContaining({
        id: product.id,
        name: product.name,
        isActive: false,
        ticketVolume: 1,
      }),
    );
  });

  it('should filter by productId', async () => {
    const productA = await createProduct('Filter Product A');
    const productB = await createProduct('Filter Product B');

    await createTicket({
      title: 'A ticket',
      productId: productA.id,
    });

    await createTicket({
      title: 'B ticket',
      productId: productB.id,
    });

    const response = await dashboardRequest()
      .query({
        productId: productA.id,
      })
      .expect(200);

    const body = response.body as ProductAnalyticsResponse;

    expect(body.meta.query.productId).toBe(productA.id);
    expect(body.data.summary.totalTickets).toBe(1);

    const a = body.data.products.find((item) => item.id === productA.id);
    const b = body.data.products.find((item) => item.id === productB.id);

    expect(a?.ticketVolume).toBe(1);
    expect(b?.ticketVolume).toBe(0);
  });

  it('should honor date filtering', async () => {
    const product = await createProduct('Date Product');

    await createTicket({
      title: 'Inside range',
      productId: product.id,
      createdAt: new Date('2026-10-05T10:00:00.000Z'),
    });

    await createTicket({
      title: 'Outside range',
      productId: product.id,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    });

    const response = await dashboardRequest()
      .query({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-06T23:59:59.999Z',
      })
      .expect(200);

    const body = response.body as ProductAnalyticsResponse;

    expect(body.data.summary.totalTickets).toBe(1);
  });

  it('should not expose another organization products or tickets', async () => {
    const ownProduct = await createProduct('Own Product');

    await createTicket({
      title: 'Own ticket',
      productId: ownProduct.id,
    });

    const foreign = await createOrganizationTestFixture(app);

    try {
      const foreignProduct = await database.product.create({
        data: {
          organizationId: foreign.organization.id,
          name: 'Foreign Product',
        },
      });

      await database.ticket.create({
        data: {
          organizationId: foreign.organization.id,
          requesterId: foreign.requester.userId,
          ticketNumber: `FOREIGN-PD-${randomUUID().slice(0, 8)}`,
          title: 'Foreign ticket',
          description: 'Foreign ticket',
          productId: foreignProduct.id,
        },
      });

      const response = await dashboardRequest().expect(200);

      const body = response.body as ProductAnalyticsResponse;

      expect(body.data.summary.totalTickets).toBe(1);

      expect(body.data.products).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ownProduct.id,
          }),
        ]),
      );

      expect(body.data.products).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: foreignProduct.id,
          }),
        ]),
      );
    } finally {
      await database.organization.delete({
        where: {
          id: foreign.organization.id,
        },
      });

      await database.user.deleteMany({
        where: {
          id: {
            in: [
              foreign.owner.userId,
              foreign.admin.userId,
              foreign.agent.userId,
              foreign.requester.userId,
            ],
          },
        },
      });
    }
  });

  it('should reject an invalid date range', async () => {
    await dashboardRequest()
      .query({
        from: '2026-10-06T00:00:00.000Z',
        to: '2026-10-05T00:00:00.000Z',
      })
      .expect(400);
  });

  it('should require authentication', async () => {
    const request = app.getHttpServer();

    const response = await import('supertest').then(({ default: supertest }) =>
      supertest(request)
        .get('/api/v1/reports/analytics/products')
        .set('x-organization-id', fixture.organization.id),
    );

    expect(response.status).toBe(401);
  });
});
