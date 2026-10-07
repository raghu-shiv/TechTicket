import type { INestApplication } from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';

import { createTestApp } from './helpers/app.helper.js';

import { createOrganizationTestFixture } from './helpers/organization.helper.js';

interface ProductResponse {
  id: string;

  organizationId: string;

  name: string;

  description: string | null;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;

  _count?: {
    tickets: number;
  };
}

describe('Product API (e2e)', () => {
  let app: INestApplication;

  let database: DatabaseService;

  let fixture: Awaited<ReturnType<typeof createOrganizationTestFixture>>;

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);

    fixture = await createOrganizationTestFixture(app);
  });

  afterEach(async () => {
    /*
     * Remove tickets before products because Ticket.productId references
     * Product. This keeps the test organization clean between tests.
     */

    await database.ticket.deleteMany({
      where: {
        organizationId: fixture.organization.id,
      },
    });

    await database.product.deleteMany({
      where: {
        organizationId: fixture.organization.id,
      },
    });
  });

  afterAll(async () => {
    await database.ticket.deleteMany({
      where: {
        organizationId: fixture.organization.id,
      },
    });

    await database.product.deleteMany({
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

  async function createProduct(
    name = `Product ${randomUUID()}`,

    overrides: Partial<{
      description: string;

      isActive: boolean;
    }> = {},
  ) {
    return organizationHeaders(owner().post('/api/v1/products'))
      .send({
        name,

        ...overrides,
      })

      .expect(201);
  }

  async function deactivateProduct(productId: string) {
    /*
     * Product lifecycle uses PATCH rather than a dedicated
     * /deactivate endpoint.
     */

    return organizationHeaders(owner().patch(`/api/v1/products/${productId}`))
      .send({
        isActive: false,
      })

      .expect(200);
  }

  async function activateProduct(productId: string) {
    return organizationHeaders(owner().patch(`/api/v1/products/${productId}`))
      .send({
        isActive: true,
      })

      .expect(200);
  }

  describe('GET /api/v1/products', () => {
    it('should return an empty list when the organization has no products', async () => {
      const response = await organizationHeaders(
        owner().get('/api/v1/products'),
      ).expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return products belonging to the current organization', async () => {
      const created = await createProduct('Support Portal');

      const response = await organizationHeaders(
        owner().get('/api/v1/products'),
      ).expect(200);

      expect(response.body).toHaveLength(1);

      expect(response.body[0]).toEqual(
        expect.objectContaining({
          id: created.body.id,

          organizationId: fixture.organization.id,

          name: 'Support Portal',

          isActive: true,
        }),
      );
    });

    it('should return the complete product response shape', async () => {
      await createProduct('Analytics Platform', {
        description: 'Customer analytics and reporting platform.',
      });

      const response = await organizationHeaders(
        owner().get('/api/v1/products'),
      ).expect(200);

      const product = response.body[0] as ProductResponse;

      expect(product).toEqual(
        expect.objectContaining({
          id: expect.any(String),

          organizationId: fixture.organization.id,

          name: 'Analytics Platform',

          description: 'Customer analytics and reporting platform.',

          isActive: true,

          createdAt: expect.any(String),

          updatedAt: expect.any(String),
        }),
      );
    });

    it('should include ticket count for each product', async () => {
      const product = await createProduct('Ticketed Product');

      const response = await organizationHeaders(
        owner().get('/api/v1/products'),
      ).expect(200);

      expect(response.body[0]).toEqual(
        expect.objectContaining({
          id: product.body.id,

          _count: {
            tickets: 0,
          },
        }),
      );
    });

    it('should return active products before inactive products', async () => {
      const active = await createProduct('Active Product');

      const inactive = await createProduct('Inactive Product');

      await deactivateProduct(inactive.body.id);

      const response = await organizationHeaders(
        owner().get('/api/v1/products'),
      ).expect(200);

      expect(response.body[0].id).toBe(active.body.id);

      expect(response.body[0].isActive).toBe(true);

      expect(response.body[1].id).toBe(inactive.body.id);

      expect(response.body[1].isActive).toBe(false);
    });

    it('should allow organization members to list products', async () => {
      await createProduct('Member Visible Product');

      const adminResponse = await organizationHeaders(
        admin().get('/api/v1/products'),
      ).expect(200);

      const agentResponse = await organizationHeaders(
        agent().get('/api/v1/products'),
      ).expect(200);

      const requesterResponse = await organizationHeaders(
        requester().get('/api/v1/products'),
      ).expect(200);

      expect(adminResponse.body).toHaveLength(1);

      expect(agentResponse.body).toHaveLength(1);

      expect(requesterResponse.body).toHaveLength(1);
    });
  });

  describe('GET /api/v1/products/:productId', () => {
    it('should return a product belonging to the current organization', async () => {
      const created = await createProduct('Product Detail');

      const response = await organizationHeaders(
        owner().get(`/api/v1/products/${created.body.id}`),
      ).expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: created.body.id,

          organizationId: fixture.organization.id,

          name: 'Product Detail',

          isActive: true,
        }),
      );
    });

    it('should return 404 for a product that does not exist', async () => {
      await organizationHeaders(
        owner().get(`/api/v1/products/${randomUUID()}`),
      ).expect(404);
    });
  });

  describe('POST /api/v1/products', () => {
    it('should create an active product by default', async () => {
      const response = await createProduct('New Product');

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),

          organizationId: fixture.organization.id,

          name: 'New Product',

          description: null,

          isActive: true,

          createdAt: expect.any(String),

          updatedAt: expect.any(String),
        }),
      );
    });

    it('should create a product with a description', async () => {
      const response = await createProduct('Product With Description', {
        description: 'Product description.',
      });

      expect(response.body.description).toBe('Product description.');
    });

    it('should trim product names', async () => {
      const response = await createProduct('   Trimmed Product   ');

      expect(response.body.name).toBe('Trimmed Product');
    });

    it('should trim product descriptions', async () => {
      const response = await createProduct('Trimmed Description', {
        description: '   Product description   ',
      });

      expect(response.body.description).toBe('Product description');
    });

    it('should allow an explicitly inactive product to be created', async () => {
      const response = await createProduct('Inactive Product', {
        isActive: false,
      });

      expect(response.body.isActive).toBe(false);
    });

    it('should reject a duplicate product name within the organization', async () => {
      await createProduct('Duplicate Product');

      await organizationHeaders(owner().post('/api/v1/products'))
        .send({
          name: 'Duplicate Product',
        })

        .expect(409);
    });

    it('should reject a blank product name', async () => {
      await organizationHeaders(owner().post('/api/v1/products'))
        .send({
          name: '   ',
        })

        .expect(400);
    });

    it('should reject an invalid product payload', async () => {
      await organizationHeaders(owner().post('/api/v1/products'))
        .send({
          name: 123,
        })

        .expect(400);
    });

    it('should reject a product name longer than 100 characters', async () => {
      await organizationHeaders(owner().post('/api/v1/products'))
        .send({
          name: 'P'.repeat(101),
        })

        .expect(400);
    });

    it('should reject a description longer than 500 characters', async () => {
      await organizationHeaders(owner().post('/api/v1/products'))
        .send({
          name: 'Long Description Product',

          description: 'D'.repeat(501),
        })

        .expect(400);
    });

    it('should prevent a REQUESTER from creating a product', async () => {
      await organizationHeaders(requester().post('/api/v1/products'))
        .send({
          name: 'Requester Product',
        })

        .expect(403);
    });

    it('should allow an ADMIN to create a product', async () => {
      const response = await organizationHeaders(
        admin().post('/api/v1/products'),
      )
        .send({
          name: 'Admin Product',
        })

        .expect(201);

      expect(response.body.name).toBe('Admin Product');
    });
  });

  describe('PATCH /api/v1/products/:productId', () => {
    it('should update the product name', async () => {
      const created = await createProduct('Original Product');

      const response = await organizationHeaders(
        owner().patch(`/api/v1/products/${created.body.id}`),
      )
        .send({
          name: 'Updated Product',
        })

        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: created.body.id,

          name: 'Updated Product',

          isActive: true,
        }),
      );
    });

    it('should update the product description', async () => {
      const created = await createProduct('Description Product');

      const response = await organizationHeaders(
        owner().patch(`/api/v1/products/${created.body.id}`),
      )
        .send({
          description: 'Updated product description.',
        })

        .expect(200);

      expect(response.body.description).toBe('Updated product description.');
    });

    it('should deactivate an active product', async () => {
      const created = await createProduct('Deactivation Product');

      const response = await deactivateProduct(created.body.id);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: created.body.id,

          isActive: false,
        }),
      );
    });

    it('should reactivate an inactive product', async () => {
      const created = await createProduct('Reactivation Product');

      await deactivateProduct(created.body.id);

      const response = await activateProduct(created.body.id);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: created.body.id,

          isActive: true,
        }),
      );
    });

    it('should reject an empty update payload', async () => {
      const created = await createProduct('Empty Update Product');

      await organizationHeaders(
        owner().patch(`/api/v1/products/${created.body.id}`),
      )
        .send({})

        .expect(400);
    });

    it('should reject a blank updated name', async () => {
      const created = await createProduct('Valid Product');

      await organizationHeaders(
        owner().patch(`/api/v1/products/${created.body.id}`),
      )
        .send({
          name: '   ',
        })

        .expect(400);
    });

    it('should reject renaming to an existing product name', async () => {
      await createProduct('Existing Product');

      const second = await createProduct('Second Product');

      await organizationHeaders(
        owner().patch(`/api/v1/products/${second.body.id}`),
      )
        .send({
          name: 'Existing Product',
        })

        .expect(409);
    });

    it('should return 404 when updating a nonexistent product', async () => {
      await organizationHeaders(
        owner().patch(`/api/v1/products/${randomUUID()}`),
      )
        .send({
          name: 'Missing Product',
        })

        .expect(404);
    });

    it('should prevent a REQUESTER from updating a product', async () => {
      const created = await createProduct('Protected Product');

      await organizationHeaders(
        requester().patch(`/api/v1/products/${created.body.id}`),
      )
        .send({
          name: 'Requester Update',
        })

        .expect(403);
    });
  });

  describe('DELETE /api/v1/products/:productId', () => {
    it('should reject deletion of an active product', async () => {
      const created = await createProduct('Active Delete Protection');

      await organizationHeaders(
        owner().delete(`/api/v1/products/${created.body.id}`),
      ).expect(409);
    });

    it('should delete an inactive product', async () => {
      const created = await createProduct('Inactive Delete Product');

      await deactivateProduct(created.body.id);

      await organizationHeaders(
        owner().delete(`/api/v1/products/${created.body.id}`),
      ).expect(200);

      await organizationHeaders(
        owner().get(`/api/v1/products/${created.body.id}`),
      ).expect(404);
    });

    it('should return 404 when deleting a nonexistent product', async () => {
      await organizationHeaders(
        owner().delete(`/api/v1/products/${randomUUID()}`),
      ).expect(404);
    });

    it('should prevent a REQUESTER from deleting a product', async () => {
      const created = await createProduct('Requester Delete Protection');

      await organizationHeaders(
        requester().delete(`/api/v1/products/${created.body.id}`),
      ).expect(403);
    });
  });

  describe('Ticket → Product integration', () => {
    it('should create a ticket with a product', async () => {
      const product = await createProduct('Ticket Product');

      const response = await organizationHeaders(
        requester().post('/api/v1/tickets'),
      )
        .send({
          title: 'Ticket with product',

          description: 'Ticket should reference the selected product.',

          priority: 'MEDIUM',

          type: 'INCIDENT',

          productId: product.body.id,
        })

        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),

          productId: product.body.id,

          product: expect.objectContaining({
            id: product.body.id,

            name: 'Ticket Product',

            isActive: true,
          }),
        }),
      );
    });

    it('should return product information when fetching a ticket', async () => {
      const product = await createProduct('Ticket Detail Product');

      const ticket = await organizationHeaders(
        requester().post('/api/v1/tickets'),
      )
        .send({
          title: 'Ticket detail product',

          description: 'Verify product in ticket detail response.',

          priority: 'LOW',

          type: 'SERVICE_REQUEST',

          productId: product.body.id,
        })

        .expect(201);

      const response = await organizationHeaders(
        requester().get(`/api/v1/tickets/${ticket.body.id}`),
      ).expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: ticket.body.id,

          productId: product.body.id,

          product: expect.objectContaining({
            id: product.body.id,

            name: 'Ticket Detail Product',

            isActive: true,
          }),
        }),
      );
    });

    it('should include product information in the ticket list response', async () => {
      const product = await createProduct('Ticket List Product');

      const ticket = await organizationHeaders(
        requester().post('/api/v1/tickets'),
      )
        .send({
          title: 'Ticket list product',

          description: 'Verify product in ticket list response.',

          priority: 'HIGH',

          type: 'INCIDENT',

          productId: product.body.id,
        })

        .expect(201);

      const response = await organizationHeaders(
        requester().get('/api/v1/tickets'),
      ).expect(200);

      const returnedTicket = response.body.data.find(
        (item: { id: string }) => item.id === ticket.body.id,
      );

      expect(returnedTicket).toEqual(
        expect.objectContaining({
          id: ticket.body.id,

          productId: product.body.id,

          product: expect.objectContaining({
            id: product.body.id,

            name: 'Ticket List Product',

            isActive: true,
          }),
        }),
      );
    });

    it('should filter tickets by productId', async () => {
      const productA = await createProduct('Product A');

      const productB = await createProduct('Product B');

      const ticketA = await organizationHeaders(
        requester().post('/api/v1/tickets'),
      )
        .send({
          title: 'Product A ticket',

          description: 'Belongs to product A.',

          priority: 'MEDIUM',

          type: 'INCIDENT',

          productId: productA.body.id,
        })

        .expect(201);

      await organizationHeaders(requester().post('/api/v1/tickets'))
        .send({
          title: 'Product B ticket',

          description: 'Belongs to product B.',

          priority: 'MEDIUM',

          type: 'INCIDENT',

          productId: productB.body.id,
        })

        .expect(201);

      const response = await organizationHeaders(
        requester().get('/api/v1/tickets'),
      )
        .query({
          productId: productA.body.id,
        })

        .expect(200);

      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          id: ticketA.body.id,

          productId: productA.body.id,
        }),
      );
    });

    it('should reject assigning an inactive product to a new ticket', async () => {
      const product = await createProduct('Inactive Ticket Product');

      await deactivateProduct(product.body.id);

      await organizationHeaders(requester().post('/api/v1/tickets'))
        .send({
          title: 'Inactive product ticket',

          description: 'This ticket should not accept an inactive product.',

          priority: 'MEDIUM',

          type: 'INCIDENT',

          productId: product.body.id,
        })

        .expect(400);
    });

    it('should reject assigning a product from another organization', async () => {
      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        const foreignProductResponse = await foreignFixture.owner.agent

          .post('/api/v1/products')

          .set('x-organization-id', foreignFixture.organization.id)

          .send({
            name: 'Foreign Product',
          })

          .expect(201);

        await organizationHeaders(requester().post('/api/v1/tickets'))
          .send({
            title: 'Cross organization product ticket',

            description:
              'A product from another organization must not be assignable.',

            priority: 'HIGH',

            type: 'INCIDENT',

            productId: foreignProductResponse.body.id,
          })

          .expect(404);
      } finally {
        await database.ticket.deleteMany({
          where: {
            organizationId: foreignFixture.organization.id,
          },
        });

        await database.product.deleteMany({
          where: {
            organizationId: foreignFixture.organization.id,
          },
        });

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

    it('should update the product on an existing ticket', async () => {
      const firstProduct = await createProduct('Original Ticket Product');

      const secondProduct = await createProduct('Updated Ticket Product');

      const ticket = await organizationHeaders(
        requester().post('/api/v1/tickets'),
      )
        .send({
          title: 'Product update ticket',

          description: 'Product should be replaceable.',

          priority: 'MEDIUM',

          type: 'INCIDENT',

          productId: firstProduct.body.id,
        })

        .expect(201);

      const response = await organizationHeaders(
        agent().patch(`/api/v1/tickets/${ticket.body.id}`),
      )
        .send({
          productId: secondProduct.body.id,
        })

        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: ticket.body.id,

          productId: secondProduct.body.id,

          product: expect.objectContaining({
            id: secondProduct.body.id,

            name: 'Updated Ticket Product',

            isActive: true,
          }),
        }),
      );
    });

    it('should reject updating a ticket to an inactive product', async () => {
      const activeProduct = await createProduct('Active Product');

      const inactiveProduct = await createProduct('Inactive Product');

      await deactivateProduct(inactiveProduct.body.id);

      const ticket = await organizationHeaders(
        requester().post('/api/v1/tickets'),
      )
        .send({
          title: 'Inactive product update ticket',

          description: 'Ticket starts with an active product.',

          priority: 'MEDIUM',

          type: 'INCIDENT',

          productId: activeProduct.body.id,
        })

        .expect(201);

      await organizationHeaders(
        agent().patch(`/api/v1/tickets/${ticket.body.id}`),
      )
        .send({
          productId: inactiveProduct.body.id,
        })

        .expect(400);
    });

    it('should allow a ticket product to be cleared', async () => {
      const product = await createProduct('Clearable Product');

      const ticket = await organizationHeaders(
        requester().post('/api/v1/tickets'),
      )
        .send({
          title: 'Clear product ticket',

          description: 'Product should be removable from the ticket.',

          priority: 'LOW',

          type: 'QUESTION',

          productId: product.body.id,
        })

        .expect(201);

      const response = await organizationHeaders(
        agent().patch(`/api/v1/tickets/${ticket.body.id}`),
      )
        .send({
          productId: null,
        })

        .expect(200);

      expect(response.body.productId).toBeNull();

      expect(response.body.product).toBeNull();
    });
  });

  describe('Organization isolation', () => {
    it('should not expose a product belonging to another organization', async () => {
      const product = await createProduct('Private Product');

      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        await foreignFixture.owner.agent

          .get(`/api/v1/products/${product.body.id}`)

          .set('x-organization-id', foreignFixture.organization.id)

          .expect(404);

        const listResponse = await foreignFixture.owner.agent

          .get('/api/v1/products')

          .set('x-organization-id', foreignFixture.organization.id)

          .expect(200);

        expect(listResponse.body).toEqual([]);
      } finally {
        await database.product.deleteMany({
          where: {
            organizationId: foreignFixture.organization.id,
          },
        });

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

    it('should not allow another organization to update a product', async () => {
      const product = await createProduct('Isolation Update Product');

      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        await foreignFixture.owner.agent

          .patch(`/api/v1/products/${product.body.id}`)

          .set('x-organization-id', foreignFixture.organization.id)

          .send({
            name: 'Cross Organization Update',
          })

          .expect(404);
      } finally {
        await database.product.deleteMany({
          where: {
            organizationId: foreignFixture.organization.id,
          },
        });

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

    it('should not allow another organization to delete a product', async () => {
      const product = await createProduct('Isolation Delete Product');

      await deactivateProduct(product.body.id);

      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        await foreignFixture.owner.agent

          .delete(`/api/v1/products/${product.body.id}`)

          .set('x-organization-id', foreignFixture.organization.id)

          .expect(404);
      } finally {
        await database.product.deleteMany({
          where: {
            organizationId: foreignFixture.organization.id,
          },
        });

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

    it('should not expose products from another organization through the list', async () => {
      await createProduct('Organization A Product');

      const foreignFixture = await createOrganizationTestFixture(app);

      try {
        await foreignFixture.owner.agent

          .post('/api/v1/products')

          .set('x-organization-id', foreignFixture.organization.id)

          .send({
            name: 'Organization B Product',
          })

          .expect(201);

        const response = await organizationHeaders(
          owner().get('/api/v1/products'),
        ).expect(200);

        expect(response.body).toHaveLength(1);

        expect(response.body[0].name).toBe('Organization A Product');

        expect(
          response.body.some(
            (product: ProductResponse) =>
              product.name === 'Organization B Product',
          ),
        ).toBe(false);
      } finally {
        await database.product.deleteMany({
          where: {
            organizationId: foreignFixture.organization.id,
          },
        });

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
